
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const CHAT_IDS = [
  process.env.CHAT_ID_1,
  process.env.CHAT_ID_2
].filter(Boolean).map(String);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "review-photos";
const PRODUCTS=[["chicken","Куриные котлеты с овощами"],["classic","Сырники классические"],["choco","Сырники шоколадные"],["rafaello","Сырники «Рафаэлло»"],["varenko","Сырники с варёнкой"],["beef","Говяжьи котлеты"],["meatp","Блинчики с мясом"],["curdp","Блинчики с творогом"],["condensed","Блинчики с варёной сгущёнкой"],["apple","Блинчики с яблоком и корицей"],["chopped","Рубленые куриные котлеты"],["meatballs","Фрикадельки"]].map(([id,name])=>({id,name}));
const PRODUCT_STATUSES={available:"В наличии",preorder:"Готовим по предзаказу",unavailable:"Нет в наличии"};
const ORDER_STATUSES={new:"Получен",accepted:"Принят",preparing:"Готовится",ready:"Готов",courier:"Передан курьеру",completed:"Завершён",cancelled:"Отменён"};
const FULFILLMENT_TYPES={delivery:"Доставка",pickup:"Самовывоз"};

const PRODUCT_CATALOG={
  chicken:{name:"Куриные котлеты с овощами",unitPrice:7,min:10},
  classic:{name:"Сырники классические",unitPrice:6,min:10},
  choco:{name:"Сырники шоколадные",unitPrice:7,min:10},
  rafaello:{name:"Сырники «Рафаэлло»",unitPrice:7,min:10},
  varenko:{name:"Сырники с варёнкой",unitPrice:7,min:10},
  beef:{name:"Говяжьи котлеты",unitPrice:10,min:10},
  meatp:{name:"Блинчики с мясом",unitPrice:9,min:10},
  curdp:{name:"Блинчики с творогом",unitPrice:6,min:10},
  condensed:{name:"Блинчики с варёной сгущёнкой",unitPrice:6,min:10},
  apple:{name:"Блинчики с яблоком и корицей",unitPrice:7,min:10},
  chopped:{name:"Рубленые куриные котлеты",unitPrice:7.5,min:8},
  meatballs:{name:"Фрикадельки",unitPrice:25,min:1}
};
const RATE_LIMITS=new Map();
const ORDER_REQUESTS=new Map();
const RATE_WINDOW_MS=10*60*1000;
const ORDER_REQUEST_TTL=15*60*1000;

function clientKey(req){
  const forwarded=String(req.headers["x-forwarded-for"]||"").split(",")[0].trim();
  return (forwarded||req.socket.remoteAddress||"unknown").slice(0,100);
}
function rateLimit(req,key,limit,windowMs){
  const now=Date.now(),bucket=key+":"+clientKey(req);
  let entry=RATE_LIMITS.get(bucket);
  if(!entry||now-entry.startedAt>=windowMs)entry={startedAt:now,count:0};
  entry.count++;
  RATE_LIMITS.set(bucket,entry);
  if(RATE_LIMITS.size>5000){
    for(const [k,v] of RATE_LIMITS)if(now-v.startedAt>windowMs)RATE_LIMITS.delete(k);
  }
  return {allowed:entry.count<=limit,retryAfter:Math.max(1,Math.ceil((windowMs-(now-entry.startedAt))/1000))};
}
function sendJson(res,status,payload,extraHeaders={}){
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extraHeaders});
  res.end(JSON.stringify(payload));
}
function hasUnsafeControl(value){
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}
function priceForProduct(id,quantity){
  if(id==="chopped")return quantity===8?60:60+(quantity-8)*7.5;
  if(id==="classic")return Math.floor(quantity/10)*60+(quantity%10)*6;
  if(id==="beef")return Math.floor(quantity/10)*100+(quantity%10)*10;
  return PRODUCT_CATALOG[id].unitPrice*quantity;
}
function formatSomoni(value){
  return (Number.isInteger(value)?String(value):value.toFixed(2).replace(/0+$/,"").replace(/\.$/,""))+" сомони";
}
function validateOrderPayload(order){
  if(!order||typeof order!=="object"||Array.isArray(order))return {error:"Invalid order"};
  const name=typeof order.name==="string"?order.name.trim():"";
  const phone=typeof order.phone==="string"?order.phone.trim():"";
  const address=typeof order.address==="string"?order.address.trim():"";
  const comment=typeof order.comment==="string"?order.comment.trim():"";
  const digits=phone.replace(/\D/g,"");
  if(name.length<2||name.length>80||hasUnsafeControl(name))return {error:"Проверьте имя: от 2 до 80 символов."};
  if(digits.length<7||digits.length>15||hasUnsafeControl(phone))return {error:"Проверьте номер телефона."};
  if(address.length<5||address.length>250||hasUnsafeControl(address))return {error:"Проверьте адрес доставки."};
  if(comment.length>500||hasUnsafeControl(comment))return {error:"Комментарий слишком длинный или содержит недопустимые символы."};
  if(!Array.isArray(order.items)||order.items.length<1||order.items.length>12)return {error:"Некорректный состав заказа."};
  const seen=new Set(),items=[];
  for(const row of order.items){
    if(!row||typeof row!=="object"||Array.isArray(row)||typeof row.id!=="string"||!Object.hasOwn(PRODUCT_CATALOG,row.id))return {error:"В заказе обнаружен неизвестный товар."};
    const product=PRODUCT_CATALOG[row.id],quantity=row.quantity;
    if(!Number.isSafeInteger(quantity)||quantity<product.min||quantity>200||seen.has(row.id))return {error:"Некорректное количество товара: "+product.name};
    seen.add(row.id);
    const total=priceForProduct(row.id,quantity);
    if(!Number.isFinite(total)||total<=0)return {error:"Некорректная стоимость товара."};
    items.push({id:row.id,name:product.name,quantity,total});
  }
  const total=items.reduce((sum,item)=>sum+item.total,0);
  if(!Number.isFinite(total)||total<=0||total>100000)return {error:"Сумма заказа выходит за допустимые пределы."};
  return {value:{name,phone,address,comment,items,total}};
}
async function processOrderPayload(order,record){
  const checked=validateOrderPayload(order);
  if(checked.error)return {status:400,body:{error:checked.error}};
  const clean=checked.value;
  let statuses;
  try{statuses=await getProductStatuses()}
  catch(error){console.error("Could not validate product availability:",error.message);return {status:503,body:{error:"Не удалось проверить наличие товаров. Попробуйте позже."}}}
  const unavailable=clean.items.find(item=>(statuses[item.id]||"available")==="unavailable");
  if(unavailable)return {status:409,body:{error:"Товар «"+unavailable.name+"» сейчас недоступен. Обновите корзину."}};
  if(!record.trackingAttempted){
    record.trackingAttempted=true;
    try{record.trackedOrder=await createTrackedOrder({name:clean.name,items:clean.items.map(x=>({name:x.name,quantity:x.quantity,price:formatSomoni(x.total)})),total:formatSomoni(clean.total)})}
    catch(error){console.warn("Order tracking is unavailable; continuing with Telegram delivery:",error.message)}
  }
  const itemText=clean.items.map(item=>item.name+" × "+item.quantity+" — "+formatSomoni(item.total)).join("\n");
  const message=[
    "🛍 НОВЫЙ ЗАКАЗ LEPÍ","",
    "👤 Имя: "+clean.name,
    "📞 Телефон: "+clean.phone,
    "📍 Адрес: "+clean.address,
    "","🧺 Заказ:",itemText,"",
    "💰 Сумма: "+formatSomoni(clean.total),
    "💬 Комментарий: "+(clean.comment||"Нет"),
    ...(record.trackedOrder?["📦 Номер заказа: "+record.trackedOrder.order_number,"🔗 Отслеживание: "+record.trackedOrder.url,"","📦 Текущий статус: "+ORDER_STATUSES.new]:[])
  ].join("\n");
  const results=await Promise.all(CHAT_IDS.map(async chatId=>{
    if(record.sentRecipients.has(chatId))return true;
    try{
      await telegram("sendMessage",{chat_id:chatId,text:message,...(record.trackedOrder?{reply_markup:orderFulfillmentKeyboard(record.trackedOrder.id)}:{})});
      record.sentRecipients.add(chatId);
      return true;
    }catch(error){console.error("Order delivery failed:",error.message);return false}
  }));
  if(!results.every(Boolean))return {status:502,body:{error:"Не удалось доставить заказ всем получателям. Повторите отправку через минуту."}};
  return {status:200,body:{success:true,tracking:record.trackedOrder?{orderNumber:record.trackedOrder.order_number,url:record.trackedOrder.url}:null}};
}

let polling = false;
let offset = 0;

function isAdmin(chatId, userId) {
  return CHAT_IDS.includes(String(chatId)) &&
    CHAT_IDS.includes(String(userId));
}

async function telegram(method, data = {}) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(35000)
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram HTTP ${response.status}`);
  }

  return result.result;
}

async function sendText(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

function supabaseHeaders(extra = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase environment variables are missing");
  }

  // Новый ключ sb_secret_ передаём через apikey.
  return {
    apikey: SUPABASE_KEY,
    ...extra
  };
}

async function dbRequest(path, options = {}) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: supabaseHeaders(options.headers || {}),
      signal: AbortSignal.timeout(15000)
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase database error ${response.status}: ${body}`
    );
  }

  return body ? JSON.parse(body) : null;
}

async function getProductStatuses(){const rows=await dbRequest("product_statuses?select=product_id,status");return Object.fromEntries(rows.map(row=>[row.product_id,row.status]))}
async function setProductStatus(productId,status){if(!PRODUCTS.some(p=>p.id===productId)||!Object.hasOwn(PRODUCT_STATUSES,status))throw new Error("Invalid product status");return dbRequest("product_statuses?on_conflict=product_id",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({product_id:productId,status,updated_at:new Date().toISOString()})})}
function productStatusKeyboard(productId,statuses){
  const current=statuses[productId]||"available";
  return {inline_keyboard:[[
    {text:(current==="available"?"✓ ":"")+"В наличии",callback_data:`stock:${productId}:available`},
    {text:(current==="preorder"?"✓ ":"")+"Предзаказ",callback_data:`stock:${productId}:preorder`},
    {text:(current==="unavailable"?"✓ ":"")+"Нет",callback_data:`stock:${productId}:unavailable`}
  ]]};
}
function productStatusText(productId,statuses){
  const product=PRODUCTS.find(p=>p.id===productId);
  if(!product) throw new Error("Unknown product");
  const status=statuses[productId]||"available";
  return `📦 ${product.name}\nСтатус: ${PRODUCT_STATUSES[status]}`;
}
async function showProductStatusMenu(chatId){
  const statuses=await getProductStatuses();
  await sendText(chatId,"📦 Наличие товаров\nВыбери статус под каждым товаром:");
  for(let i=0;i<PRODUCTS.length;i++){
    const product=PRODUCTS[i];
    await sendText(chatId,productStatusText(product.id,statuses),{
      reply_markup:productStatusKeyboard(product.id,statuses)
    });
    if(i<PRODUCTS.length-1) await new Promise(resolve=>setTimeout(resolve,1050));
  }
}
function orderFulfillmentKeyboard(orderId){
  return {inline_keyboard:[[
    {text:"🚚 Доставка",callback_data:`ful:${orderId}:delivery`},
    {text:"🏠 Самовывоз",callback_data:`ful:${orderId}:pickup`}
  ]]};
}
function orderStatusKeyboard(orderId,status,fulfillmentType){
  const rows=[["accepted","preparing","ready"]];
  if(fulfillmentType==="delivery")rows.push(["courier","completed","cancelled"]);
  else rows.push(["completed","cancelled"]);
  return {inline_keyboard:rows.map(row=>row.map(key=>({text:(status===key?"✓ ":"")+(key==="completed"&&fulfillmentType==="pickup"?"Забран клиентом":ORDER_STATUSES[key]),callback_data:`ord:${orderId}:${key}`})))};
}
async function createTrackedOrder(order){
  const token=crypto.randomBytes(24).toString("hex");
  const orderNumber="LEPI-"+Date.now().toString(36).toUpperCase();
  const rows=await dbRequest("orders?select=id,order_number,tracking_token",{
    method:"POST",headers:{"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify({order_number:orderNumber,tracking_token:token,customer_name:order.name,items:order.items,total:order.total,status:"new",fulfillment_type:null,status_updated_at:new Date().toISOString()})
  });
  if(!rows||!rows[0]||!rows[0].id)throw new Error("Order tracking record was not created");
  return {...rows[0],url:`${ALLOWED_ORIGIN.replace(/\/+$/,"")}/track.html?token=${token}`};
}
async function updateTrackedOrderFulfillment(orderId,fulfillmentType){
  if(!Object.hasOwn(FULFILLMENT_TYPES,fulfillmentType))throw new Error("Invalid fulfillment type");
  const existing=await dbRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,fulfillment_type`);
  if(!existing||!existing[0])throw new Error("Order not found");
  if(existing[0].fulfillment_type&&existing[0].fulfillment_type!==fulfillmentType){
    throw new Error("Способ получения уже выбран: "+FULFILLMENT_TYPES[existing[0].fulfillment_type]);
  }
  const rows=await dbRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,status,fulfillment_type`,{
    method:"PATCH",headers:{"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify({fulfillment_type:fulfillmentType,status_updated_at:new Date().toISOString()})
  });
  if(!rows||!rows[0])throw new Error("Order not found");
  return rows[0];
}
async function updateTrackedOrderStatus(orderId,status){
  if(!Object.hasOwn(ORDER_STATUSES,status))throw new Error("Invalid order status");
  const current=await dbRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,fulfillment_type`);
  if(!current||!current[0])throw new Error("Order not found");
  if(!current[0].fulfillment_type)throw new Error("Сначала выберите способ получения");
  if(status==="courier"&&current[0].fulfillment_type!=="delivery")throw new Error("Курьер доступен только для доставки");
  const rows=await dbRequest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,status,fulfillment_type`,{
    method:"PATCH",headers:{"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify({status,status_updated_at:new Date().toISOString()})
  });
  if(!rows||!rows[0])throw new Error("Order not found");
  return rows[0];
}
async function getTrackedOrder(token){
  const rows=await dbRequest(`orders?tracking_token=eq.${encodeURIComponent(token)}&select=order_number,customer_name,items,total,status,fulfillment_type,created_at,status_updated_at`);
  return rows&&rows[0]?rows[0]:null;
}


async function getReviews() {
  return dbRequest(
    "reviews?select=id,name,review_text,photo_url,created_at&order=created_at.desc"
  );
}

async function savePhotoToSupabase(fileId) {
  const fileInfo = await telegram("getFile", {
    file_id: fileId
  });

  if (!fileInfo.file_path) {
    throw new Error("Telegram photo path missing");
  }

  const downloadUrl =
    `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;

  const photoResponse = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(60000)
  });

  if (!photoResponse.ok) {
    throw new Error("Could not download photo from Telegram");
  }

  const imageBuffer = Buffer.from(
    await photoResponse.arrayBuffer()
  );

  // Ограничиваем размер загружаемого файла.
  if (imageBuffer.length > 8 * 1024 * 1024) {
    throw new Error("Photo is larger than 8 MB");
  }

  const extension = (
    fileInfo.file_path.split(".").pop() || "jpg"
  ).toLowerCase();

  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

  const safeExtension = allowedExtensions.includes(extension)
    ? extension
    : "jpg";

  const contentType = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  }[safeExtension];

  const objectPath =
    `reviews/${Date.now()}-${Math.random()
      .toString(36).slice(2, 10)}.${safeExtension}`;

  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: supabaseHeaders({
        "Content-Type": contentType,
        "x-upsert": "false"
      }),
      body: imageBuffer,
      signal: AbortSignal.timeout(60000)
    }
  );

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text();
    throw new Error(
      `Photo upload failed ${uploadResponse.status}: ${details}`
    );
  }

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${SUPABASE_BUCKET}/${objectPath}`
  );
}

async function addReview(name, text, photoUrl) {
  const rows = await dbRequest("reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      name,
      review_text: text,
      photo_url: photoUrl
    })
  });

  if (!rows || !rows[0]) {
    throw new Error("Review was not saved");
  }

  return rows[0];
}

async function deleteReview(id) {
  const rows = await dbRequest(
    `reviews?id=eq.${encodeURIComponent(id)}&select=id`,
    {
      method: "DELETE",
      headers: { Prefer: "return=representation" }
    }
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function showReviews(chatId) {
  const reviews = await getReviews();

  if (!reviews.length) {
    return sendText(chatId, "Пока отзывов нет.", {
      reply_markup: {
        keyboard: [[{ text: "Наличие товаров" }], [{ text: "Отзывы" }]],
        resize_keyboard: true
      }
    });
  }

  await sendText(chatId, `Всего отзывов: ${reviews.length}`);

  for (const review of reviews) {
    const caption = [
      `👤 ${review.name}`,
      "",
      review.review_text,
      "",
      `ID: ${review.id}`
    ].join("\n").slice(0, 1000);

    const keyboard = {
      inline_keyboard: [[{
        text: "🗑 Удалить",
        callback_data: `del:${review.id}`
      }]]
    };

    if (review.photo_url) {
      await telegram("sendPhoto", {
        chat_id: chatId,
        photo: review.photo_url,
        caption,
        reply_markup: keyboard
      });
    } else {
      await sendText(chatId, caption, {
        reply_markup: keyboard
      });
    }
  }
}

async function handleUpdate(update) {
  const message = update.message;

  if (message) {
    const chatId = String(message.chat.id);
    const userId = String(message.from?.id || "");

    if (!isAdmin(chatId, userId)) return;

    const text = (message.text || "").trim();

    if (text === "/start") {
      return sendText(
        chatId,
        "LEPÍ — панель управления.\n\n" +
        "Для изменения наличия нажми «Наличие товаров».\n" +
        "Для работы с отзывами отправь фотографию с подписью:\n" +
        "первая строка — имя клиента\n" +
        "вторая и следующие строки — текст отзыва.\n\n" +
        "Нажми «Отзывы», чтобы посмотреть и удалить отзывы.",
        {
          reply_markup: {
            keyboard: [[{ text: "Наличие товаров" }], [{ text: "Отзывы" }]],
            resize_keyboard: true
          }
        }
      );
    }

    if(text==="Наличие товаров"||text==="/stock"){try{return await showProductStatusMenu(chatId)}catch(error){console.error("Could not show product statuses:",error.message);return sendText(chatId,"Не удалось загрузить наличие. Проверь таблицу product_statuses в Supabase.")}}
    if (text === "Отзывы" || text === "/reviews") {
      try {
        return await showReviews(chatId);
      } catch (error) {
        console.error("Could not show reviews:", error.message);
        return sendText(
          chatId,
          "Не удалось загрузить отзывы. Проверь настройки Supabase."
        );
      }
    }

    if (message.photo?.length) {
      const caption = (message.caption || "").trim();
      const lines = caption.split(/\r?\n/);
      const name = (lines.shift() || "").trim();
      const reviewText = lines.join("\n").trim();

      if (!name || !reviewText) {
        return sendText(
          chatId,
          "Добавь подпись к фотографии в формате:\n" +
          "Имя клиента\nТекст отзыва"
        );
      }

      try {
        const largestPhoto =
          message.photo[message.photo.length - 1];

        const photoUrl = await savePhotoToSupabase(
          largestPhoto.file_id
        );

        const review = await addReview(
          name.slice(0, 100),
          reviewText.slice(0, 3000),
          photoUrl
        );

        return sendText(
          chatId,
          `✅ Отзыв ${review.name} сохранён.`
        );
      } catch (error) {
        console.error("Could not save review:", error.message);
        return sendText(
          chatId,
          "❌ Не удалось сохранить отзыв. " +
          "Проверь настройки Supabase и попробуй ещё раз."
        );
      }
    }

    return sendText(
      chatId,
      "Отправь фото с подписью или нажми «Отзывы»."
    );
  }

  const callback = update.callback_query;
  if (!callback) return;

  const chatId = String(callback.message?.chat?.id || "");
  const userId = String(callback.from?.id || "");

  if (!isAdmin(chatId, userId)) {
    return telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Нет доступа.",
      show_alert: true
    });
  }

  const fulfillmentMatch=/^ful:([0-9a-f-]{36}):(delivery|pickup)$/.exec(callback.data||"");
  if(fulfillmentMatch){
    const [,orderId,fulfillmentType]=fulfillmentMatch;
    try{
      const updated=await updateTrackedOrderFulfillment(orderId,fulfillmentType);
      const baseText=String(callback.message?.text||"").split("\n\n🚚 Способ получения:")[0];
      const modeLabel=FULFILLMENT_TYPES[fulfillmentType];
      await telegram("editMessageText",{chat_id:chatId,message_id:callback.message.message_id,text:baseText+"\n\n🚚 Способ получения: "+modeLabel+"\n\n📦 Текущий статус: "+ORDER_STATUSES.new,reply_markup:orderStatusKeyboard(orderId,"new",fulfillmentType)});
      await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Выбран способ: "+modeLabel});
      await Promise.all(CHAT_IDS.filter(id=>id!==chatId).map(id=>sendText(id,"📦 "+updated.order_number+" — способ получения: "+modeLabel)));
    }catch(error){
      console.error("Could not set order fulfillment:",error.message);
      await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Не удалось выбрать способ получения.",show_alert:true});
    }
    return;
  }

  const orderMatch=/^ord:([0-9a-f-]{36}):(accepted|preparing|ready|courier|completed|cancelled)$/.exec(callback.data||"");
  if(orderMatch){
    const [,orderId,nextStatus]=orderMatch;
    try{
      const updated=await updateTrackedOrderStatus(orderId,nextStatus);
      const baseText=String(callback.message?.text||"").split("\n\n📦 Текущий статус:")[0];
      const mode=updated.fulfillment_type;
      const statusLabel=nextStatus==="completed"&&mode==="pickup"?"Забран клиентом":ORDER_STATUSES[nextStatus];
      await telegram("editMessageText",{chat_id:chatId,message_id:callback.message.message_id,text:baseText+"\n\n📦 Текущий статус: "+statusLabel,reply_markup:orderStatusKeyboard(orderId,nextStatus,mode)});
      await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Статус "+updated.order_number+": "+ORDER_STATUSES[nextStatus]});
      await Promise.all(CHAT_IDS.filter(id=>id!==chatId).map(id=>sendText(id,"📦 "+updated.order_number+" — новый статус: "+ORDER_STATUSES[nextStatus])));
    }catch(error){
      console.error("Could not update order status:",error.message);
      await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Не удалось обновить статус заказа.",show_alert:true});
    }
    return;
  }

  const stockMatch=/^stock:([a-z0-9_-]+):(available|preorder|unavailable)$/.exec(callback.data||"");
  if(stockMatch){
    const [,productId,status]=stockMatch;
    // Сразу закрываем индикатор загрузки Telegram, не дожидаясь ответа базы данных.
    try{
      await telegram("answerCallbackQuery",{
        callback_query_id:callback.id,
        text:"Сохраняю изменение…"
      });
    }catch(error){
      console.error("Could not acknowledge stock callback:",error.message);
    }
    try{
      await setProductStatus(productId,status);
      const statuses=await getProductStatuses();
      await telegram("editMessageText",{
        chat_id:chatId,
        message_id:callback.message.message_id,
        text:productStatusText(productId,statuses),
        reply_markup:productStatusKeyboard(productId,statuses)
      });
    }catch(error){
      console.error("Could not update product status:",error.message);
      try{
        const statuses=await getProductStatuses();
        await telegram("editMessageText",{
          chat_id:chatId,
          message_id:callback.message.message_id,
          text:productStatusText(productId,statuses)+"\n\n⚠️ Не удалось сохранить изменение. Попробуй ещё раз.",
          reply_markup:productStatusKeyboard(productId,statuses)
        });
      }catch(updateError){
        console.error("Could not refresh stock menu after error:",updateError.message);
      }
    }
    return;
  }
  const match = /^del:(\d+)$/.exec(callback.data || "");

  if (!match) {
    return telegram("answerCallbackQuery", {
      callback_query_id: callback.id
    });
  }

  try {
    const deleted = await deleteReview(match[1]);

    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: deleted ? "Отзыв удалён." : "Отзыв уже не найден."
    });

    if (deleted) {
      await telegram("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: callback.message.message_id,
        reply_markup: { inline_keyboard: [] }
      });
    }
  } catch (error) {
    console.error("Could not delete review:", error.message);

    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Не удалось удалить отзыв.",
      show_alert: true
    });
  }
}

async function pollTelegram() {
  if (polling || !BOT_TOKEN || CHAT_IDS.length !== 2) return;

  polling = true;

  try {
    await telegram("deleteWebhook", {
      drop_pending_updates: false
    });

    while (true) {
      try {
        const updates = await telegram("getUpdates", {
          offset,
          timeout: 25,
          allowed_updates: ["message", "callback_query"]
        });

        for (const update of updates) {
          offset = update.update_id + 1;

          try {
            await handleUpdate(update);
          } catch (error) {
            console.error(
              "Telegram update error:",
              error.message
            );
          }
        }
      } catch (error) {
        console.error(
          "Telegram polling error:",
          error.message
        );

        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error(
      "Telegram bot startup error:",
      error.message
    );
  } finally {
    polling = false;
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  res.setHeader("Cache-Control","no-store");
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Order-Request-Id"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (origin && ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
    res.writeHead(403);
    return res.end(JSON.stringify({
      error: "Origin not allowed"
    }));
  }

  if (origin && ALLOWED_ORIGIN) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      ALLOWED_ORIGIN
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const pathname = new URL(req.url, "http://localhost").pathname;

  if(req.method==="POST"&&pathname==="/telegram/webhook"){
    if(!TELEGRAM_WEBHOOK_SECRET || req.headers["x-telegram-bot-api-secret-token"]!==TELEGRAM_WEBHOOK_SECRET){
      res.writeHead(403);
      return res.end(JSON.stringify({error:"Forbidden"}));
    }
    try{
      let body="";
      for await(const chunk of req){
        body+=chunk;
        if(body.length>1000000){
          res.writeHead(413);
          return res.end(JSON.stringify({error:"Update too large"}));
        }
      }
      const update=JSON.parse(body);
      await handleUpdate(update);
      res.writeHead(200,{"Cache-Control":"no-store"});
      return res.end("OK");
    }catch(error){
      console.error("Telegram webhook update error:",error.message);
      res.writeHead(200,{"Cache-Control":"no-store"});
      return res.end("OK");
    }
  }

if(req.method==="GET"&&pathname==="/api/product-statuses"){
    const limit=rateLimit(req,"statuses",60,60*1000);
    if(!limit.allowed)return sendJson(res,429,{error:"Too many requests"},{"Retry-After":String(limit.retryAfter)});
    try{const statuses=await getProductStatuses();return sendJson(res,200,{statuses})}
    catch(error){console.error("Could not load product statuses:",error.message);return sendJson(res,503,{error:"Product statuses unavailable"})}
  }

  if(req.method==="GET"&&pathname==="/api/track"){
    const limit=rateLimit(req,"tracking",30,60*1000);
    if(!limit.allowed)return sendJson(res,429,{error:"Too many requests"},{"Retry-After":String(limit.retryAfter)});
    const token=new URL(req.url,"http://localhost").searchParams.get("token")||"";
    if(!/^[a-f0-9]{48}$/.test(token)){res.writeHead(400);return res.end(JSON.stringify({error:"Invalid tracking link"}))}
    try{
      const order=await getTrackedOrder(token);
      if(!order){res.writeHead(404);return res.end(JSON.stringify({error:"Order not found"}))}
      res.writeHead(200,{"Cache-Control":"no-store"});
      return res.end(JSON.stringify({order:{orderNumber:order.order_number,customerName:order.customer_name,items:order.items,total:order.total,status:order.status,fulfillmentType:order.fulfillment_type,createdAt:order.created_at,updatedAt:order.status_updated_at}}));
    }catch(error){
      console.error("Could not load tracked order:",error.message);
      res.writeHead(503);return res.end(JSON.stringify({error:"Tracking temporarily unavailable"}));
    }
  }

  if (req.method === "GET" && pathname === "/api/reviews") {
    const limit=rateLimit(req,"reviews",30,60*1000);
    if(!limit.allowed)return sendJson(res,429,{error:"Too many requests"},{"Retry-After":String(limit.retryAfter)});
    try {
      const reviews = await getReviews();

      res.writeHead(200, {
        "Cache-Control": "no-store"
      });

      return res.end(JSON.stringify({
        reviews: reviews.map(review => ({
          id: review.id,
          name: review.name,
          text: review.review_text,
          photo: review.photo_url,
          createdAt: review.created_at
        }))
      }));
    } catch (error) {
      console.error(
        "Could not load reviews:",
        error.message
      );

      res.writeHead(500);
      return res.end(JSON.stringify({
        error: "Could not load reviews"
      }));
    }
  }

  if(req.method!=="POST"||pathname!=="/api/order"){
    return sendJson(res,404,{error:"Not found"});
  }
  if(!BOT_TOKEN||CHAT_IDS.length!==2||!ALLOWED_ORIGIN){
    console.error("Configuration error: check required environment variables");
    return sendJson(res,500,{error:"Server not configured"});
  }
  if(origin!==ALLOWED_ORIGIN)return sendJson(res,403,{error:"Origin not allowed"});
  if(!/^application\/json(?:;|$)/i.test(String(req.headers["content-type"]||"")))return sendJson(res,415,{error:"Content-Type must be application/json"});
  const limit=rateLimit(req,"orders",5,RATE_WINDOW_MS);
  if(!limit.allowed)return sendJson(res,429,{error:"Слишком много попыток оформления. Попробуйте позже."},{"Retry-After":String(limit.retryAfter)});
  const requestId=String(req.headers["x-order-request-id"]||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))return sendJson(res,400,{error:"Missing or invalid order request ID"});
  try{
    let body="",bytes=0;
    for await(const chunk of req){
      bytes+=Buffer.byteLength(chunk);
      if(bytes>20000)return sendJson(res,413,{error:"Order too large"});
      body+=chunk;
    }
    let order;
    try{order=JSON.parse(body)}catch{return sendJson(res,400,{error:"Invalid JSON"})}
    const checked=validateOrderPayload(order);
    if(checked.error)return sendJson(res,400,{error:checked.error});
    const fingerprint=crypto.createHash("sha256").update(JSON.stringify(order)).digest("hex");
    const now=Date.now();
    for(const [key,value] of ORDER_REQUESTS)if(value.expiresAt<=now)ORDER_REQUESTS.delete(key);
    let record=ORDER_REQUESTS.get(requestId);
    if(record&&record.fingerprint!==fingerprint)return sendJson(res,409,{error:"Request ID already used for a different order"});
    if(!record){
      record={fingerprint,promise:null,response:null,expiresAt:now+ORDER_REQUEST_TTL,trackingAttempted:false,trackedOrder:null,sentRecipients:new Set()};
      ORDER_REQUESTS.set(requestId,record);
    }
    if(record.promise){
      const result=await record.promise;
      return sendJson(res,result.status,result.body);
    }
    if(record.response&&record.response.status===200)return sendJson(res,record.response.status,record.response.body);
    record.promise=processOrderPayload(order,record).catch(error=>{
      console.error("Order processing failed:",error.message);
      return {status:500,body:{error:"Could not process order"}};
    });
    const result=await record.promise;
    record.promise=null;
    record.response=result;
    record.expiresAt=Date.now()+ORDER_REQUEST_TTL;
    return sendJson(res,result.status,result.body);
  }catch(error){
    console.error("Order request failed:",error.message);
    return sendJson(res,400,{error:"Invalid order request"});
  }
});

async function startTelegram(){
  if(!BOT_TOKEN || CHAT_IDS.length!==2){
    console.error("Telegram bot configuration is incomplete.");
    return;
  }
  if(TELEGRAM_WEBHOOK_SECRET && RENDER_EXTERNAL_URL){
    try{
      const url=RENDER_EXTERNAL_URL.replace(/\/+$/,"")+"/telegram/webhook";
      await telegram("setWebhook",{
        url,
        secret_token:TELEGRAM_WEBHOOK_SECRET,
        allowed_updates:["message","callback_query"],
        drop_pending_updates:false
      });
      console.log("Telegram webhook configured:",url);
    }catch(error){
      console.error("Could not configure Telegram webhook:",error.message);
      console.warn("Falling back to long polling.");
      pollTelegram();
    }
    return;
  }
  console.warn("Webhook secret or Render URL missing; falling back to long polling.");
  pollTelegram();
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LEPI orders server listening on ${PORT}`);
  startTelegram();
});
