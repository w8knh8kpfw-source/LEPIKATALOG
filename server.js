
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
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
      headers: supabaseHeaders(options.headers || {})
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
async function showProductStatusMenu(chatId){const statuses=await getProductStatuses();for(const p of PRODUCTS){const status=statuses[p.id]||"available";await sendText(chatId,p.name,{reply_markup:{inline_keyboard:[Object.entries(PRODUCT_STATUSES).map(([key,label])=>({text:(status===key?"✓ ":"")+label,callback_data:`stock:${p.id}:${key}`}))]}})}}

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
  if(stockMatch){const [,productId,status]=stockMatch;try{await setProductStatus(productId,status);const p=PRODUCTS.find(item=>item.id===productId);const label=PRODUCT_STATUSES[status];await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Обновлено: "+label});await telegram("editMessageText",{chat_id:chatId,message_id:callback.message.message_id,text:p.name+"\n\nСтатус: "+label,reply_markup:{inline_keyboard:[Object.entries(PRODUCT_STATUSES).map(([key,value])=>({text:(status===key?"✓ ":"")+value,callback_data:`stock:${productId}:${key}`}))]}})}catch(error){console.error("Could not update product status:",error.message);await telegram("answerCallbackQuery",{callback_query_id:callback.id,text:"Не удалось обновить. Проверь таблицу product_statuses в Supabase.",show_alert:true})}return}
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
    "Content-Type"
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

if(req.method==="GET"&&pathname==="/api/product-statuses"){try{const statuses=await getProductStatuses();res.writeHead(200,{"Cache-Control":"no-store"});return res.end(JSON.stringify({statuses}))}catch(error){console.error("Could not load product statuses:",error.message);res.writeHead(503);return res.end(JSON.stringify({error:"Product statuses unavailable"}))}}

  if(req.method==="GET"&&pathname==="/api/track"){
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

  if (req.method !== "POST" || req.url !== "/api/order") {
    res.writeHead(404);
    return res.end(JSON.stringify({
      error: "Not found"
    }));
  }

  if (!BOT_TOKEN || CHAT_IDS.length !== 2 || !ALLOWED_ORIGIN) {
    console.error(
      "Configuration error: check required environment variables"
    );

    res.writeHead(500);
    return res.end(JSON.stringify({
      error: "Server not configured"
    }));
  }

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk;

      if (body.length > 20000) {
        res.writeHead(413);
        return res.end(JSON.stringify({
          error: "Order too large"
        }));
      }
    }

    const order = JSON.parse(body);

    const name = String(order.name || "").trim();
    const phone = String(order.phone || "").trim();
    const address = String(order.address || "").trim();
    const comment = String(order.comment || "").trim();
    const items = order.items;
    const total = String(order.total ?? "").trim();

    if (!name || !phone || !Array.isArray(items) ||
        items.length === 0) {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "Missing order details"
      }));
    }

    let trackedOrder=null;
    try{
      trackedOrder=await createTrackedOrder({name,items,total});
    }catch(error){
      console.warn("Order tracking is not enabled; continuing with normal order delivery:",error.message);
    }

    const itemText = items.map(item => {
      if (typeof item === "string") return item;

      return [
        item.name || item.title || "Товар",
        item.quantity ? ` × ${item.quantity}` : "",
        item.price != null ? ` — ${item.price}` : ""
      ].join("");
    }).join("\n");

    const message = [
      "🛍 НОВЫЙ ЗАКАЗ LEPÍ",
      "",
      `👤 Имя: ${name}`,
      `📞 Телефон: ${phone}`,
      `📍 Адрес: ${address || "Не указан"}`,
      "",
      "🧺 Заказ:",
      itemText,
      "",
      `💰 Сумма: ${total || "Не указана"}`,
      `💬 Комментарий: ${comment || "Нет"}`,
      ...(trackedOrder?[`📦 Номер заказа: ${trackedOrder.order_number}`,`🔗 Отслеживание: ${trackedOrder.url}`,"",`📦 Текущий статус: ${ORDER_STATUSES.new}`]:[])
    ].join("\n");

    const results = await Promise.all(
      CHAT_IDS.map(async (chatId, index) => {
        try {
          const result = await telegram("sendMessage", {
            chat_id: chatId,
            text: message,
            ...(trackedOrder?{reply_markup:orderFulfillmentKeyboard(trackedOrder.id)}:{})
          });

          return Boolean(result.message_id);
        } catch (error) {
          console.error(
            `Order delivery failed for recipient ${index + 1}:`,
            error.message
          );

          return false;
        }
      })
    );

    if (results.every(Boolean)) {
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        tracking:trackedOrder?{orderNumber:trackedOrder.order_number,url:trackedOrder.url}:null
      }));
    }

    res.writeHead(502);
    return res.end(JSON.stringify({
      error: "Could not deliver order to all recipients"
    }));
  } catch (error) {
    console.error(
      "Order processing failed:",
      error.message
    );

    res.writeHead(400);
    return res.end(JSON.stringify({
      error: "Invalid order request"
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LEPI orders server listening on ${PORT}`);
  pollTelegram();
});
