
"use strict";

const ORDER_ENDPOINT="https://lepi-orders.onrender.com/api/order";
const STATUS_ENDPOINT="https://lepi-orders.onrender.com/api/product-statuses";
const productStatuses={};
const STATUS_META={available:{label:"В наличии",className:"available"},preorder:{label:"Готовим по предзаказу",className:"preorder"},unavailable:{label:"Нет в наличии",className:"unavailable"}};
function productStatus(id){return STATUS_META[productStatuses[id]]?productStatuses[id]:"available"}
function statusMarkup(id,extraClass=""){const meta=STATUS_META[productStatus(id)];return `<div class="product-status ${meta.className} ${extraClass}">${meta.label}</div>`}
async function loadProductStatuses(){try{const response=await fetch(STATUS_ENDPOINT,{cache:"no-store"});if(!response.ok)throw new Error("Product statuses unavailable");const data=await response.json();Object.assign(productStatuses,data.statuses||{});render();renderBundles()}catch(error){console.warn("Не удалось загрузить статусы товаров:",error.message)}}

const products=[
 {id:"chicken",name:"Куриные котлеты с овощами",category:"Котлеты",price:70,unitPrice:7,unit:"10 штук",min:10,mode:"bulk",badge:"Хит продаж",desc:"Домашние куриные котлеты с овощами. Минимум 10 штук — 70 сомони.",image:"images/cutlets-chicken-veg.jpg",pos:"50% 50%"},
 {id:"classic",name:"Сырники классические",category:"Сырники",price:60,unitPrice:6,unit:"10 штук",min:10,mode:"bulk",badge:"Классика",desc:"6 сомони за штуку или 60 сомони за 10 штук.",image:"images/syrniki-classic.jpg",pos:"50% 50%"},
 {id:"choco",name:"Сырники шоколадные",category:"Сырники",price:70,unitPrice:7,unit:"10 штук",min:10,mode:"bulk",badge:"Популярное",desc:"Шоколадные сырники. 10 штук — 70 сомони.",image:"images/syrniki-chocolate.jpg",pos:"50% 55%"},
 {id:"rafaello",name:"Сырники «Рафаэлло»",category:"Сырники",price:70,unitPrice:7,unit:"10 штук",min:10,mode:"bulk",badge:"Десерт",desc:"Сырники «Рафаэлло». 10 штук — 70 сомони.",image:"images/syrniki-rafaello.jpg",pos:"50% 55%"},
 {id:"varenko",name:"Сырники с варёнкой",category:"Сырники",price:70,unitPrice:7,unit:"10 штук",min:10,mode:"bulk",badge:"Новинка",desc:"Новинка с варёной сгущёнкой. 10 штук — 70 сомони.",image:"images/syrniki-varenka.jpg",pos:"50% 55%"},
 {id:"beef",name:"Говяжьи котлеты",category:"Котлеты",price:100,unitPrice:10,unit:"10 штук",min:10,mode:"bulk",badge:"Говядина",desc:"10 сомони за штуку или 100 сомони за 10 штук.",image:"images/cutlets-beef.jpg",pos:"50% 50%"},
 {id:"meatp",name:"Блинчики с мясом",category:"Блинчики",price:90,unitPrice:9,unit:"10 штук",min:10,mode:"bulk",badge:"Хит продаж",desc:"Сытные блинчики с мясной начинкой. 10 штук — 90 сомони.",image:"images/crepes-meat.jpg",pos:"50% 55%"},
 {id:"curdp",name:"Блинчики с творогом",category:"Блинчики",price:60,unitPrice:6,unit:"10 штук",min:10,mode:"bulk",badge:"Любимый вкус",desc:"Блинчики с творожной начинкой. 10 штук — 60 сомони.",image:"images/crepes-curd.jpg",pos:"50% 55%"},
 {id:"condensed",name:"Блинчики с варёной сгущёнкой",category:"Блинчики",price:60,unitPrice:6,unit:"10 штук",min:10,mode:"bulk",badge:"Новинка",desc:"Сладкие блинчики с варёной сгущёнкой. 10 штук — 60 сомони.",image:"images/crepes-condensed.jpg",pos:"50% 50%"},
 {id:"apple",name:"Блинчики с яблоком и корицей",category:"Блинчики",price:70,unitPrice:7,unit:"10 штук",min:10,mode:"bulk",badge:"Хит сезона",desc:"Новинка с ароматным яблоком и корицей. 10 штук — 70 сомони.",image:"images/crepes-apple.jpg",pos:"50% 52%"},
 {id:"chopped",name:"Рубленые куриные котлеты",category:"Котлеты",price:60,unitPrice:7.5,unit:"8 штук",min:8,mode:"bulk",badge:"Минимум 8 штук",desc:"Минимальный заказ — 8 штук за 60 сомони. Затем количество растёт по одной штуке.",image:"images/cutlets-chopped-chicken.jpg",pos:"50% 42%"},
 {id:"meatballs",name:"Фрикадельки",category:"Фрикадельки",price:25,unitPrice:25,unit:"пачка · 250 г",min:1,mode:"pack",badge:"250 г",desc:"Одна пачка весом 250 г — 25 сомони. Заказ считается пачками.",image:"images/meatballs.jpg",pos:"50% 55%"}
];

const bundles=[
 {id:"breakfast",name:"Завтрак дома",tag:"Для уютного утра",description:"Сырники и блинчики с разными начинками.",items:["classic","curdp","apple"]},
 {id:"lunch",name:"Сытный обед",tag:"На каждый день",description:"Куриные и говяжьи котлеты с фрикадельками.",items:["chicken","beef","meatballs"]},
 {id:"tea",name:"Сладкий вечер",tag:"К чаю",description:"Три вида сладких блинчиков для семейного чаепития.",items:["curdp","condensed","apple"]}
];
const relatedProducts={chicken:["meatballs","beef"],classic:["curdp","rafaello"],choco:["rafaello","varenko"],rafaello:["classic","choco"],varenko:["rafaello","condensed"],beef:["chicken","meatballs"],meatp:["chicken","beef"],curdp:["classic","apple"],condensed:["varenko","rafaello"],apple:["curdp","classic"],chopped:["chicken","meatballs"],meatballs:["chicken","chopped"]};
function renderBundles(){
 const target=$("bundleGrid");if(!target)return;
 target.innerHTML=bundles.map(bundle=>{
  const chosen=bundle.items.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const total=chosen.reduce((n,p)=>n+cost(p,p.min),0);
  const unavailable=chosen.some(p=>productStatus(p.id)==="unavailable");
  const rows=chosen.map(p=>'<div class="bundle-item">'+image(p,true)+'<span>'+esc(p.name)+' · '+esc(qtyText(p,p.min))+'</span></div>').join("");
  return '<article class="bundle-card"><div class="kicker">'+esc(bundle.tag)+'</div><h3>'+esc(bundle.name)+'</h3><p>'+esc(bundle.description)+'</p><div class="bundle-items">'+rows+'</div><div class="bundle-total"><span>Итого за набор</span><strong>'+money(total)+'</strong></div><button class="btn primary" type="button" data-bundle="'+bundle.id+'" '+(unavailable?"disabled":"")+'>'+(unavailable?"Временно недоступно":"Добавить набор")+'</button></article>';
 }).join("");
}
function addBundle(id){
 const bundle=bundles.find(item=>item.id===id);if(!bundle)return;
 const chosen=bundle.items.map(pid=>products.find(p=>p.id===pid)).filter(Boolean);
 if(chosen.some(p=>productStatus(p.id)==="unavailable")){toast("В наборе есть временно недоступный товар");return}
 chosen.forEach(p=>{cart[p.id]=(cart[p.id]||0)+p.min});updateCart();toast("Подборка добавлена в корзину");
}
function relatedMarkup(product){
 const chosen=(relatedProducts[product.id]||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean);if(!chosen.length)return "";
 const rows=chosen.map(p=>'<div class="related-item">'+image(p,true)+'<div class="related-copy"><b>'+esc(p.name)+'</b><small>'+money(p.price)+' · '+esc(p.unit)+'</small></div><button class="related-add" type="button" data-related-add="'+p.id+'" '+(productStatus(p.id)==="unavailable"?"disabled":"")+' aria-label="Добавить '+esc(p.name)+'">+</button></div>').join("");
 return '<div class="related-block"><div class="related-title">Хорошо сочетается с</div><div class="related-list">'+rows+'</div></div>';
}
function cartSuggestionMarkup(list){
 const inCart=new Set(list.map(p=>p.id));const ids=[...new Set(list.flatMap(p=>relatedProducts[p.id]||[]))].filter(id=>!inCart.has(id)).slice(0,2);
 const chosen=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);if(!chosen.length)return "";
 const rows=chosen.map(p=>'<div class="related-item">'+image(p,true)+'<div class="related-copy"><b>'+esc(p.name)+'</b><small>'+money(p.price)+' · '+esc(p.unit)+'</small></div><button class="related-add" type="button" data-cart-add="'+p.id+'" '+(productStatus(p.id)==="unavailable"?"disabled":"")+' aria-label="Добавить '+esc(p.name)+'">+</button></div>').join("");
 return '<div class="cart-suggestions"><h3>Можно добавить к заказу</h3><div class="related-list">'+rows+'</div></div>';
}

/* Составы, предоставленные для товаров LEPÍ. */
const ingredients={
 chicken:[
  "Куриное филе","Лук","Морковь","Чеснок","Сливочное масло",
  "Рисовая мука","Панировочные сухари","Соль","Чёрный молотый перец"
 ],
 classic:["Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Ванилин","Соль"],
 choco:["Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Молочный шоколад","Ванилин"],
 rafaello:["Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Белый шоколад","Кокосовая стружка","Ванилин"],
 varenko:["Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Варёная сгущёнка","Ванилин"],
 beef:["Мясо говядины","Лук","Мякоть батона","Молоко","Яйцо","Сливочное масло","Панировочные сухари","Чеснок","Соль","Чёрный молотый перец"],
 meatp:[
  "Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин, растительное масло, сливочное масло",
  "Начинка: говядина, лук, сливочное масло, растительное масло, соль, чёрный молотый перец"
 ],
 curdp:[
  "Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин, растительное масло, сливочное масло",
  "Начинка: творог 5%, сахар, сливочное масло, ванилин"
 ],
 condensed:[
  "Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин, растительное масло, сливочное масло",
  "Начинка: варёная сгущёнка, дроблёные грецкие орехи"
 ],
 apple:[
  "Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин, растительное масло, сливочное масло",
  "Начинка: яблоки, тростниковый сахар, сливочное масло, корица, лимонный сок"
 ],
 chopped:["Куриное филе","Сыр","Лук","Панировочные сухари","Яйцо","Укроп","Чеснок","Соль","Чёрный молотый перец"],
 meatballs:["Куриное филе","Лук","Панировочные сухари","Яйцо","Соль","Чёрный молотый перец"]
};

const CART_STORAGE_KEY="lepi-cart-v1";
function readSavedCart(){
 try{
  const saved=JSON.parse(localStorage.getItem(CART_STORAGE_KEY)||"{}");
  if(!saved||typeof saved!=="object"||Array.isArray(saved))return {};
  return Object.fromEntries(Object.entries(saved).filter(([id,q])=>
   products.some(product=>product.id===id)&&Number.isSafeInteger(q)&&q>0&&q<=999
  ));
 }catch(error){return {}}
}
function createCart(initial={}){
 const target={...initial};
 const persist=()=>{
  try{
   if(Object.keys(target).length)localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(target));
   else localStorage.removeItem(CART_STORAGE_KEY);
  }catch(error){console.warn("Не удалось сохранить корзину:",error)}
 };
 return new Proxy(target,{
  set(object,key,value){
   if(typeof key!=="string"||!products.some(product=>product.id===key)||!Number.isSafeInteger(value)||value<1||value>999)return true;
   object[key]=value;persist();return true;
  },
  deleteProperty(object,key){
   delete object[key];persist();return true;
  }
 });
}

let category="Все",query="",sorting="default",cart=createCart(readSavedCart()),selected="",detailQty=0;
let orderSending=false,guideIndex=0,toastTimer=null,activeOrderRequestId=null;
const $=id=>document.getElementById(id);

const money=n=>{
 const value=Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");
 return `${value} сомони`;
};

function esc(s){
 return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${name}"></use></svg>`}
function toast(message){
 $("toast").textContent=message;$("toast").classList.add("show");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2500);
}
function cost(p,q){
 if(p.id==="classic")return Math.floor(q/10)*60+(q%10)*6;
 if(p.id==="beef")return Math.floor(q/10)*100+(q%10)*10;
 if(p.id==="chopped")return q===8?60:60+(q-8)*7.5;
 return q*p.unitPrice;
}
function qtyText(p,q){
 if(p.mode==="pack")return `${q} ${q===1?"пачка":"пачек"} · ${q*250} г`;
 return `${q} шт.`;
}
function pic(name){return `<div class="placeholder"><div><b>${esc(name)}</b></div></div>`}
function image(p,lazy=false){
 if(!p.image)return pic(p.name);
 return `<img src="${esc(p.image)}" alt="${esc(p.name)}" ${lazy?'loading="lazy" ':''}decoding="async" data-hide-on-error="true" style="object-position:${esc(p.pos||"50% 50%")}">`;
}
document.addEventListener("error",event=>{
 const target=event.target;
 if(target instanceof HTMLImageElement&&target.dataset.hideOnError==="true")target.hidden=true;
},true);
function ingredientSummary(p){
 const list=ingredients[p.id];
 if(!list||!list.length)return "Состав уточняется";
 return list.join("; ");
}
function ingredientMarkup(p){
 const list=ingredients[p.id];
 if(!list||!list.length)return `<p>Состав уточняется. Пожалуйста, свяжитесь с нами до заказа.</p>`;
 return `<ul class="ingredient-list">${list.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`;
}

const cookingGuides={
 chicken:["Обжарьте котлеты","Разогрейте немного масла. Готовьте котлеты на умеренном огне под крышкой, периодически переворачивая.","Доведите до полной готовности внутри."],
 classic:["Обжарьте сырники","Разогрейте сковороду с небольшим количеством масла. Готовьте на слабом или среднем огне с двух сторон до золотистой корочки.","Убавьте огонь и прогрейте сырники внутри."],
 choco:["Обжарьте сырники","Готовьте на слабом или среднем огне с небольшим количеством масла, перевернув до румяной корочки.","Доведите до готовности внутри и подавайте тёплыми."],
 rafaello:["Обжарьте сырники","Готовьте на слабом или среднем огне с небольшим количеством масла с двух сторон до золотистой корочки.","Доведите до готовности внутри. Подавайте тёплыми."],
 varenko:["Обжарьте сырники","Готовьте на слабом или среднем огне с небольшим количеством масла с двух сторон до золотистой корочки.","Доведите до готовности внутри и подавайте тёплыми."],
 beef:["Обжарьте котлеты","Разогрейте немного масла. Готовьте котлеты на умеренном огне под крышкой, переворачивая для равномерной обжарки.","Убедитесь, что котлеты полностью приготовились внутри."],
 meatp:["Подрумяньте блинчики","Разогрейте сковороду и слегка смажьте маслом. Обжарьте блинчики на умеренном огне до румяной корочки.","Переверните и прогрейте начинку внутри."],
 curdp:["Подрумяньте блинчики","Слегка смажьте разогретую сковороду маслом. Обжарьте блинчики с двух сторон до лёгкой золотистой корочки.","Снимите с огня, когда творожная начинка хорошо прогреется."],
 condensed:["Подрумяньте блинчики","Слегка смажьте разогретую сковороду маслом. Обжарьте блинчики с двух сторон до лёгкой золотистой корочки.","Прогрейте начинку, не перегревая, чтобы она не вытекала."],
 apple:["Подрумяньте блинчики","Слегка смажьте разогретую сковороду маслом. Обжарьте блинчики с двух сторон до лёгкой золотистой корочки.","Прогрейте до горячей начинки внутри и подавайте тёплыми."],
 chopped:["Обжарьте котлеты","Разогрейте немного масла. Готовьте котлеты на умеренном или слабом огне под крышкой, периодически переворачивая.","Доведите до полной готовности внутри."],
 meatballs:["Приготовьте фрикадельки","Добавьте фрикадельки в горячий соус или бульон. Готовьте при слабом кипении, аккуратно перемешивая.","Убедитесь, что фрикадельки полностью приготовились внутри."]
};
function cookingStepIcon(type){
 if(type==="pan")return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13a3 3 0 0 1 3 3v1H7a3 3 0 0 1-3-3v-1Z"/><path d="M20 13h2M8 12V9m4 3V8M5 19h14"/></svg>';
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5"/><circle cx="12" cy="12" r="9"/></svg>';
}
function cookingGuideMarkup(p){
 const guide=cookingGuides[p.id];if(!guide)return "";
 const rows=guide.slice(1).map((text,index)=>'<div class="cooking-step"><span class="cooking-step-icon">'+cookingStepIcon(index?"check":"pan")+'</span><div><b>'+esc(index?"Проверьте готовность":guide[0])+'</b><p>'+esc(text)+'</p></div></div>').join("");
 return '<section class="cooking-guide"><button class="cooking-toggle" type="button" data-cooking-toggle aria-expanded="false" aria-controls="cookingPanel-'+p.id+'"><span class="cooking-toggle-main"><span class="cooking-toggle-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h13a3 3 0 0 1 3 3v1H7a3 3 0 0 1-3-3v-1Z"/><path d="M20 14h2M8 13V9m4 4V7m-6 13h12"/></svg></span><span class="cooking-toggle-copy"><strong>Способ приготовления</strong><small>Нажмите, чтобы посмотреть инструкцию</small></span></span><span class="cooking-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></button><div class="cooking-panel" id="cookingPanel-'+p.id+'" aria-hidden="true"><div class="cooking-panel-inner"><div class="cooking-steps">'+rows+'<p class="cooking-note">Время приготовления зависит от размера продукта и особенностей плиты. Перед подачей убедитесь, что середина полностью прогрелась.</p></div></div></div></section>';
}

function render(){
 let list=products.filter(p=>
  (category==="Все"||p.category===category)&&
  (p.name+" "+p.desc+" "+p.category+" "+ingredientSummary(p)).toLowerCase().includes(query.toLowerCase())
 );
 if(sorting==="low")list.sort((a,b)=>a.price-b.price);
 if(sorting==="high")list.sort((a,b)=>b.price-a.price);
 if(sorting==="az")list.sort((a,b)=>a.name.localeCompare(b.name,"ru"));

 $("products").innerHTML=list.map(p=>`
  <article class="product" data-product="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}">
   <div class="prodimg">${image(p,true)}<span class="badge">${esc(p.badge)}</span><button class="product-favorite" data-fav="${p.id}" type="button" aria-label="Добавить в избранное" aria-pressed="false">♡</button></div>
   <div class="prodinfo">
    ${statusMarkup(p.id)}
    <div class="catname">${esc(p.category)}</div>
    <h3 class="prodname">${esc(p.name)}</h3>
    <p class="desc">${esc(p.desc)}</p>
    <p class="ingredients-preview"><strong>Состав:</strong> ${esc(ingredientSummary(p))}</p>
    <div class="price-row">
     <div class="price">${money(p.price)}<small>${p.id==="classic"||p.id==="beef"?"за 10 штук":esc(p.unit)}</small></div>
     <button class="plus" data-add="${p.id}" type="button" ${productStatus(p.id)==="unavailable"?"disabled":""} aria-label="${productStatus(p.id)==="unavailable"?"Нет в наличии":"Добавить "+esc(p.name)}">${icon("plus")}</button>
    </div>
   </div>
  </article>
 `).join("");
 $("emptyResults").style.display=list.length?"none":"block";
 if(window.LEPI_ACCOUNT?.refreshFavoriteButtons)window.LEPI_ACCOUNT.refreshFavoriteButtons();
}

let filterIndicatorReady=false;
function moveFilterIndicator(button,scrollIntoView=true){
 const indicator=$("filterIndicator"),stage=$("filtersStage");
 if(!indicator||!button||!stage)return;
 const b=button.getBoundingClientRect(),s=stage.getBoundingClientRect();
 const x=Math.round(b.left-s.left);
 const y=Math.round(b.top-s.top);
 indicator.style.width=b.width+"px";
 indicator.style.height=b.height+"px";
 indicator.style.transform="translate3d("+x+"px,"+y+"px,0)";
 indicator.style.opacity="1";
 if(scrollIntoView)button.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
}
function syncFilterIndicator(){
 const active=$("filters").querySelector(".filter.active");
 if(!active)return;
 const indicator=$("filterIndicator");
 if(!indicator)return;
 indicator.style.transition="none";
 moveFilterIndicator(active,false);
 requestAnimationFrame(()=>{
  requestAnimationFrame(()=>{
   indicator.style.transition="";
   filterIndicatorReady=true;
  });
 });
}
customElements.whenDefined("liquid-glass").then(()=>requestAnimationFrame(syncFilterIndicator));
function setCategory(value){
 category=value;
 document.querySelectorAll("[data-filter]").forEach(button=>{
  const active=button.dataset.filter===value;
  button.classList.toggle("active",active);
  button.setAttribute("aria-pressed",String(active));
  if(active)moveFilterIndicator(button);
 });
 render();
}

function openProduct(id){
 const p=products.find(item=>item.id===id);
 if(!p)return;
 selected=id;
 detailQty=cart[id]||p.min;
 $("detail").innerHTML=`
  <div class="detailimg">${image(p)}</div>
  <div class="detailcopy">
   <div class="kicker">${esc(p.category)} · ${esc(p.badge)}</div>
   <div class="detail-title-row"><h2>${esc(p.name)}</h2><button class="product-favorite detail-favorite" data-fav="${p.id}" type="button" aria-label="Добавить в избранное" aria-pressed="false">♡</button></div>
   ${statusMarkup(p.id,"product-status-detail")}
   <p>${esc(p.desc)}</p>
   <div class="detail-extra">
    <strong>Состав продукта</strong>
    ${ingredientMarkup(p)}
    <p class="allergen-note">В составе есть ингредиенты, которые могут быть важны при пищевой аллергии, включая молоко, яйца, пшеницу или орехи в зависимости от продукта. Если у вас аллергия, уточните информацию перед заказом.</p>
   </div>
   ${cookingGuideMarkup(p)}
   <p>${p.mode==="pack"?"Одна единица — пачка 250 г.":"Первое добавление — минимальная партия. Дальше количество можно увеличивать по одной штуке."}</p>
   <div class="detailprice" id="detailPrice">${money(cost(p,detailQty))}</div>
   <div class="qtyrow">
    <button class="qtybtn" id="dminus" type="button" aria-label="Уменьшить количество">${icon("minus")}</button>
    <span id="dqty">${qtyText(p,detailQty)}</span>
    <button class="qtybtn" id="dplus" type="button" aria-label="Увеличить количество">${icon("plus")}</button>
   </div>
   <button class="btn primary" id="dadd" type="button" ${productStatus(id)==="unavailable"?"disabled":""}>${productStatus(id)==="unavailable"?"Временно нет в наличии":"Добавить в корзину · "+money(cost(p,detailQty))}</button>
   ${relatedMarkup(p)}
  </div>`;
 openOverlay("productOverlay");
 if(window.LEPI_ACCOUNT?.refreshFavoriteButtons)window.LEPI_ACCOUNT.refreshFavoriteButtons();
 $("dminus").onclick=()=>changeDetail(-1);
 $("dplus").onclick=()=>changeDetail(1);
 $("dadd").onclick=()=>{
  if(productStatus(id)==="unavailable"){toast("Этот товар временно недоступен");return}
  cart[id]=detailQty>0?detailQty:p.min;
  updateCart();closeOverlay("productOverlay");openCart();toast("Корзина обновлена");
 };
}

function changeDetail(delta){
 const p=products.find(item=>item.id===selected);
 if(!p)return;
 if(delta>0)detailQty=detailQty===0?p.min:detailQty+1;
 else detailQty=detailQty===p.min?0:Math.max(0,detailQty-1);
 $("dqty").textContent=detailQty?qtyText(p,detailQty):"Не добавлено";
 $("detailPrice").textContent=money(cost(p,detailQty));
 $("dadd").textContent=detailQty?`Добавить в корзину · ${money(cost(p,detailQty))}`:`Добавить минимальную партию · ${money(cost(p,p.min))}`;
}

function add(id){
 const p=products.find(item=>item.id===id);
 if(!p)return;
 if(productStatus(id)==="unavailable"){toast("Этот товар временно недоступен");return}
 cart[id]=cart[id]?cart[id]+1:p.min;
 updateCart();toast(`Добавлено: ${qtyText(p,cart[id])}`);
}
function items(){
 return Object.entries(cart).map(([id,q])=>{
  const p=products.find(item=>item.id===id);
  return p?{...p,q,total:cost(p,q)}:null;
 }).filter(Boolean);
}
function sum(){return items().reduce((total,p)=>total+p.total,0)}
function count(){return items().reduce((total,p)=>total+p.q,0)}

let privacyConsent=false;

const FREE_DELIVERY_THRESHOLD=250;
function deliveryProgressMarkup(){
 const total=sum();
 const remaining=Math.max(0,FREE_DELIVERY_THRESHOLD-total);
 const progress=Math.min(100,total/FREE_DELIVERY_THRESHOLD*100);
 const reached=remaining===0;
 return `<section class="free-delivery ${reached?"reached":""}" aria-label="Прогресс до бесплатной доставки">
  <div class="free-delivery-heading"><strong>${reached?"Бесплатная доставка достигнута!":"До бесплатной доставки осталось…"}</strong><span>${reached?"250 / 250 сомони":money(total)+" / 250 сомони"}</span></div>
  <div class="free-delivery-track" role="progressbar" aria-label="Сумма заказа для бесплатной доставки" aria-valuemin="0" aria-valuemax="250" aria-valuenow="${Math.min(total,250)}"><span style="width:${progress}%"></span></div>
  <p>${reached?"Ваш заказ набрал 250 сомони. Доставка будет бесплатной.":"Добавьте ещё на "+money(remaining)+", чтобы получить бесплатную доставку."}</p>
 </section>`;
}

function updateCart(){
 $("cartCount").textContent=count();
 $("mobileTotal").textContent=money(sum());
 const list=items();
 if(!list.length){
  $("cartBody").innerHTML=`<div class="empty"><div class="empty-icon">${icon("bag")}</div><b>Корзина пока пуста</b>Выберите блюда в каталоге.<br><button class="btn primary" id="goCatalog" type="button">Открыть каталог ${icon("arrow")}</button></div>`;
  $("cartFoot").innerHTML='<p class="deliverywarn">Доставка оплачивается отдельно.</p>';
  $("goCatalog").onclick=()=>{closeCart();$("catalog").scrollIntoView({behavior:"smooth"})};
  return;
 }
 $("cartBody").innerHTML=list.map(p=>`
  <article class="cartline">
   <div class="cartthumb">${image(p,true)}</div>
   <div class="cartdetails">
    <div class="cartline-heading"><strong>${esc(p.name)}</strong><span class="lineprice">${money(p.total)}</span></div>
    <small class="cart-unit">${esc(qtyText(p,p.q))}</small>
    <div class="cartactions">
     <div class="quantity-control">
      <button class="minibtn" data-minus="${p.id}" type="button" aria-label="Уменьшить количество">${icon("minus")}</button>
      <span class="cart-quantity">${p.q}</span>
      <button class="minibtn" data-plus="${p.id}" type="button" aria-label="Увеличить количество">${icon("plus")}</button>
     </div>
     <button class="remove" data-remove="${p.id}" type="button" aria-label="Удалить товар">${icon("trash")}<span>Удалить</span></button>
    </div>
   </div>
  </article>
 `).join("")+cartSuggestionMarkup(list);
 $("cartFoot").innerHTML=`
  <div class="total"><span>Товары · ${count()} шт./пачек</span><strong>${money(sum())}</strong></div>
  ${deliveryProgressMarkup()}
  <label class="privacy-consent" id="privacyConsentBox" for="privacyConsent">
   <input id="privacyConsent" type="checkbox" ${privacyConsent?"checked":""}>
   <span>Я даю согласие на обработку персональных данных в целях оформления и доставки заказа. <a href="privacy.html" target="_blank" rel="noopener">Политика конфиденциальности</a>.</span>
  </label>
  <p class="privacy-hint" id="privacyHint">Чтобы оформить заказ, необходимо дать согласие на обработку персональных данных.</p>
  <button class="btn primary" id="checkoutBtn" type="button" aria-disabled="${privacyConsent?"false":"true"}">Оформить заказ ${icon("arrow")}</button>`;
 $("privacyConsent").onchange=(event)=>{privacyConsent=event.target.checked;$("checkoutBtn").setAttribute("aria-disabled",String(!privacyConsent));$("privacyHint").classList.remove("show");$("privacyConsentBox").classList.remove("pulse")};
 $("checkoutBtn").onclick=()=>{
  if(!privacyConsent){$("privacyHint").classList.add("show");const box=$("privacyConsentBox");box.classList.remove("pulse");void box.offsetWidth;box.classList.add("pulse");return}
  checkout();
 };
}

function openCart(){
 if(orderSending)return;
 $("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");
 document.body.classList.add("lock");
}
function closeCart(){
 if(orderSending)return;
 $("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");
 if(!document.querySelector(".overlay.open"))document.body.classList.remove("lock");
}
function openOverlay(id){
 if(orderSending)return;
 $(id).classList.add("open");$(id).setAttribute("aria-hidden","false");$(id).scrollTop=0;
 document.body.classList.add("lock");
}
function closeOverlay(id){
 if(orderSending&&id==="checkoutOverlay")return;
 $(id).classList.remove("open");$(id).setAttribute("aria-hidden","true");
 if(!document.querySelector(".overlay.open")&&!$("drawer").classList.contains("open"))document.body.classList.remove("lock");
}

function buildText(data){
 return [
  "НОВЫЙ ЗАКАЗ LEPÍ","",
  ...items().map(p=>`${p.name} — ${qtyText(p,p.q)} — ${money(p.total)}`),
  "",`ИТОГО ЗА ТОВАРЫ: ${money(sum())}`,
  `ДОСТАВКА: ${sum()>=FREE_DELIVERY_THRESHOLD?"бесплатно (заказ от 250 сомони)":"оплачивается отдельно"}`,"",
  `Имя: ${data.name}`,`Телефон: ${data.phone}`,`Адрес: ${data.address}`,
  `Комментарий: ${data.comment||"нет"}`
 ].join("\n");
}

function checkout(){
 if(orderSending)return;
 if(!items().length){toast("Сначала добавьте товары в корзину");return}
 closeCart();
 const orderRows=items().map(p=>`<div class="summary-row"><span>${esc(p.name)} · ${esc(qtyText(p,p.q))}</span><b>${money(p.total)}</b></div>`).join("");
 $("checkoutBody").innerHTML=`
  <div class="kicker">LEPÍ · ВАШ ЗАКАЗ</div>
  <h2>Оформление заказа</h2>
  <p class="checkoutintro">Всего три коротких шага — и мы сможем подтвердить ваш заказ.</p>
  <div class="checkout-progress" aria-label="Шаг 1 из 3">
   <span class="checkout-progress-step active"></span><span class="checkout-progress-step"></span><span class="checkout-progress-step"></span>
  </div>
  <form id="orderForm" novalidate>
   <section class="checkout-stage" data-checkout-step="1">
    <div class="checkout-art" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="8"/><path d="M9 41c1.8-8 7-12 15-12s13.2 4 15 12"/></svg></div>
    <h3>Как к вам обращаться?</h3>
    <p>Напишите ваше имя, чтобы мы знали, кому готовим заказ.</p>
    <div class="field">
     <label for="orderName">Ваше имя</label>
     <input id="orderName" name="customerName" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" required maxlength="80" placeholder="Например, Малика" aria-describedby="nameError" value="${esc(window.LEPI_ACCOUNT?.getProfile()?.name||"")}">
     <span class="field-error" id="nameError">Укажите, пожалуйста, ваше имя.</span>
    </div>
    <div class="checkout-nav"><button class="btn primary" type="button" data-checkout-next="2">Продолжить ${icon("arrow")}</button></div>
   </section>
   <section class="checkout-stage" data-checkout-step="2" hidden>
    <div class="checkout-art" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M15 7h18a3 3 0 0 1 3 3v28a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Z"/><path d="M20 12h8M21 35h6"/></svg></div>
    <h3>Ваш номер телефона</h3>
    <p>Оставьте номер, по которому мы сможем связаться и подтвердить заказ.</p>
    <div class="field">
     <label for="orderPhone">Номер телефона</label>
     <input id="orderPhone" name="customerPhone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" required maxlength="30" placeholder="+992 __ ___ __ __" aria-describedby="phoneError" value="${esc(window.LEPI_ACCOUNT?.getProfile()?.phone||"")}">
     <span class="field-error" id="phoneError">Введите корректный номер телефона.</span>
    </div>
    <div class="checkout-nav"><button class="btn checkout-back" type="button" data-checkout-back="1">Назад</button><button class="btn primary" type="button" data-checkout-next="3">Продолжить ${icon("arrow")}</button></div>
   </section>
   <section class="checkout-stage" data-checkout-step="3" hidden>
    <div class="checkout-art" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 43s15-14 15-25a15 15 0 0 0-30 0c0 11 15 25 15 25Z"/><circle cx="24" cy="18" r="5"/></svg></div>
    <h3>Куда доставить заказ?</h3>
    <p>Укажите адрес в Худжанде. Если есть ориентир, добавьте его в комментарий.</p>
    <div class="field">
     <label for="orderAddress">Адрес доставки</label>
     <input id="orderAddress" name="customerAddress" type="text" autocomplete="street-address" autocapitalize="sentences" enterkeyhint="next" required maxlength="250" placeholder="Улица, дом, квартира" aria-describedby="addressError">
     <span class="field-error" id="addressError">Укажите адрес доставки в Худжанде.</span>
    </div>
    <div class="field">
     <label for="orderComment">Комментарий <span>необязательно</span></label>
     <textarea id="orderComment" name="customerComment" maxlength="500" autocomplete="off" enterkeyhint="done" placeholder="Подъезд, этаж или пожелание"></textarea>
    </div>
    <div class="checkout-final-summary"><div class="summary"><div class="summary-title">Ваш заказ</div>${orderRows}<div class="summary-total"><span>Итого за товары</span><strong>${money(sum())}</strong></div><p class="delivery-note">${sum()>=FREE_DELIVERY_THRESHOLD?"Бесплатная доставка: сумма товаров достигла 250 сомони.":"До бесплатной доставки осталось "+money(FREE_DELIVERY_THRESHOLD-sum())+"."}</p></div></div>
    <div class="checkout-nav"><button class="btn checkout-back" type="button" data-checkout-back="2">Назад</button><button class="btn primary" id="submitOrder" type="submit">Отправить заказ ${icon("arrow")}</button></div>
   </section>
  </form>`;
 openOverlay("checkoutOverlay");
 const form=$("orderForm");
 form.addEventListener("submit",sendOrder);
 form.addEventListener("click",event=>{
  const next=event.target.closest("[data-checkout-next]");
  const back=event.target.closest("[data-checkout-back]");
  if(next){const target=Number(next.dataset.checkoutNext);if(validateCheckoutStep(target-1))showCheckoutStep(target)}
  if(back)showCheckoutStep(Number(back.dataset.checkoutBack));
 });
 for(const [id,errorId] of [["orderName","nameError"],["orderPhone","phoneError"],["orderAddress","addressError"]]){
  $(id).addEventListener("input",()=>clearFieldError($(id),errorId));
 }
}
function validateCheckoutStep(step){
 const checks={
  1:["orderName","nameError",value=>!!value,"Укажите, пожалуйста, ваше имя."],
  2:["orderPhone","phoneError",value=>value.replace(/\D/g,"").length>=7,"Введите номер телефона с кодом страны."],
  3:["orderAddress","addressError",value=>!!value,"Укажите улицу, дом и ориентир."]
 };
 const item=checks[step];if(!item)return true;
 const field=$(item[0]);const value=field.value.trim();
 if(!item[2](value)){showFieldError(field,item[1],item[3]);return false}
 clearFieldError(field,item[1]);return true;
}
function showCheckoutStep(step){
 $("checkoutBody").querySelectorAll("[data-checkout-step]").forEach(panel=>{panel.hidden=Number(panel.dataset.checkoutStep)!==step});
 $("checkoutBody").querySelectorAll(".checkout-progress-step").forEach((bar,index)=>{bar.classList.toggle("active",index===step-1);bar.classList.toggle("done",index<step-1)});
 const progress=$("checkoutBody").querySelector(".checkout-progress");if(progress)progress.setAttribute("aria-label","Шаг "+step+" из 3");
 const target=step===1?"orderName":step===2?"orderPhone":"orderAddress";
 const field=$(target);if(field)field.focus({preventScroll:true});
}
function clearFieldError(field,errorId){field.removeAttribute("aria-invalid");$(errorId).classList.remove("show")}
function showFieldError(field,errorId,message){field.setAttribute("aria-invalid","true");$(errorId).textContent=message;$(errorId).classList.add("show");field.focus()}

function setOrderLoading(active){
 orderSending=active;
 const busy=$("checkoutBusy");
 if(busy)busy.hidden=!active;
 const submit=$("submitOrder");
 if(submit){
  submit.disabled=active;
  if(active)submit.textContent="Пожалуйста, подождите…";
  else submit.innerHTML=`Отправить заказ ${icon("arrow")}`;
 }
}

async function sendOrder(event){
 event.preventDefault();
 if(orderSending)return;
 const form=event.currentTarget;
 const nameField=form.querySelector('[name="customerName"]');
 const phoneField=form.querySelector('[name="customerPhone"]');
 const addressField=form.querySelector('[name="customerAddress"]');
 const name=nameField.value.trim(),phone=phoneField.value.trim(),address=addressField.value.trim();
 if(!name){showFieldError(nameField,"nameError","Укажите, пожалуйста, ваше имя.");return}
 if(phone.replace(/\D/g,"").length<7){showFieldError(phoneField,"phoneError","Введите корректный номер телефона.");return}
 if(!address){showFieldError(addressField,"addressError","Укажите улицу, дом и при необходимости ориентир.");return}
 const data={name,phone,address,comment:form.querySelector('[name="customerComment"]').value.trim()};
 if(!ORDER_ENDPOINT){toast("Отправка заказов пока не настроена");return}
 if(!activeOrderRequestId)activeOrderRequestId=crypto.randomUUID();
 setOrderLoading(true);
 try{
  const response=await fetch(ORDER_ENDPOINT,{
   method:"POST",
   headers:{"Content-Type":"application/json","X-Order-Request-Id":activeOrderRequestId},
   body:JSON.stringify({...data,items:items().map(p=>({id:p.id,quantity:p.q}))})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"Не удалось отправить заказ");
  activeOrderRequestId=null;
  showOrderPrepared(result.tracking||null);
 }catch(error){
  setOrderLoading(false);
  toast(error.message||"Не удалось отправить заказ. Проверьте интернет и попробуйте ещё раз.");
 }
}

function showOrderPrepared(tracking=null){
 setOrderLoading(false);
 const trackingBlock=tracking&&tracking.url?'<div class="tracking-success"><div class="tracking-number">Номер заказа · '+esc(tracking.orderNumber||"LEPÍ")+'</div><a class="btn primary" href="'+esc(tracking.url)+'" target="_blank" rel="noopener">Отследить заказ '+icon("arrow")+'</a><p>По ссылке можно в любое время посмотреть актуальный статус заказа.</p></div>':"";
 const orderNumber=tracking&&tracking.orderNumber?tracking.orderNumber:"Заказ принят";
 $("checkoutBody").innerHTML=
  '<div class="success">'+
   '<div class="success-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"></circle><path d="M13 24.5 20.5 32 35 17"></path></svg></div>'+
   '<div class="success-kicker">LEPÍ · ЗАКАЗ ПОЛУЧЕН</div>'+
   '<h2>Спасибо за заказ!</h2><p>Мы получили ваш заказ. Скоро свяжемся с вами, чтобы подтвердить детали и согласовать доставку.</p>'+
   '<div class="success-summary"><div class="success-summary-row"><span>Номер заказа</span><b class="success-order-number">'+esc(orderNumber)+'</b></div><div class="success-summary-row"><span>Итого за товары</span><strong>'+money(sum())+'</strong></div></div>'+
   trackingBlock+
   '<button class="btn primary" id="finish" type="button">Вернуться в каталог</button>'+
  '</div>';
 $("finish").addEventListener("click",()=>{
  cart=createCart({});updateCart();closeOverlay("checkoutOverlay");$("catalog").scrollIntoView({behavior:"smooth"});
 });
}

/* Каталог и корзина */
$("products").addEventListener("click",event=>{
 const favoriteButton=event.target.closest("[data-fav]");
 if(favoriteButton){event.preventDefault();event.stopPropagation();window.LEPI_ACCOUNT?.toggleFavorite(favoriteButton.dataset.fav);return}
 const addButton=event.target.closest("[data-add]");
 if(addButton){event.stopPropagation();add(addButton.dataset.add);return}
 const card=event.target.closest("[data-product]");
 if(card)openProduct(card.dataset.product);
});
$("products").addEventListener("keydown",event=>{
 if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-product]")){
  event.preventDefault();openProduct(event.target.dataset.product);
 }
});
$("bundleGrid").addEventListener("click",event=>{const button=event.target.closest("[data-bundle]");if(button)addBundle(button.dataset.bundle)});
$("detail").addEventListener("click",event=>{
 const favoriteButton=event.target.closest("[data-fav]");
 if(favoriteButton){event.preventDefault();event.stopPropagation();window.LEPI_ACCOUNT?.toggleFavorite(favoriteButton.dataset.fav);return}
 const toggle=event.target.closest("[data-cooking-toggle]");
 if(toggle){
  const panel=$(toggle.getAttribute("aria-controls"));
  const expanded=toggle.getAttribute("aria-expanded")==="true";
  toggle.setAttribute("aria-expanded",String(!expanded));
  panel.classList.toggle("open",!expanded);
  panel.setAttribute("aria-hidden",String(expanded));
  return;
 }
 const button=event.target.closest("[data-related-add]");
 if(button){add(button.dataset.relatedAdd);button.textContent="✓";button.disabled=true}
});
$("cartBody").addEventListener("click",event=>{const button=event.target.closest("[data-cart-add]");if(button){add(button.dataset.cartAdd);button.textContent="✓";button.disabled=true}});
$("filters").addEventListener("click",event=>{
 const button=event.target.closest("[data-filter]");
 if(button)setCategory(button.dataset.filter);
});
window.addEventListener("resize",syncFilterIndicator,{passive:true});
requestAnimationFrame(syncFilterIndicator);
$("search").addEventListener("input",event=>{query=event.target.value;render()});
$("sort").addEventListener("change",event=>{sorting=event.target.value;render()});

document.querySelectorAll("[data-goto]").forEach(element=>{
 const go=()=>{setCategory(element.dataset.goto);$("catalog").scrollIntoView({behavior:"smooth"})};
 element.addEventListener("click",go);
 element.addEventListener("keydown",event=>{
  if(event.key==="Enter"||event.key===" "){event.preventDefault();go()}
 });
});
$("seasonBtn").addEventListener("click",()=>openProduct("apple"));
$("seasonPhoto").addEventListener("click",()=>openProduct("apple"));
$("seasonPhoto").addEventListener("keydown",event=>{
 if(event.key==="Enter"||event.key===" "){event.preventDefault();openProduct("apple")}
});
$("openCart").addEventListener("click",openCart);
$("mobileCart").addEventListener("click",openCart);
$("closeCart").addEventListener("click",closeCart);
$("menuBtn").addEventListener("click",()=>$("catalog").scrollIntoView({behavior:"smooth"}));

$("cartBody").addEventListener("click",event=>{
 const minus=event.target.closest("[data-minus]");
 const plus=event.target.closest("[data-plus]");
 const remove=event.target.closest("[data-remove]");
 if(minus){
  const id=minus.dataset.minus,product=products.find(item=>item.id===id);
  if(cart[id]<=product.min)delete cart[id];else cart[id]--;
  updateCart();
 }
 if(plus){const id=plus.dataset.plus;cart[id]++;updateCart()}
 if(remove){delete cart[remove.dataset.remove];updateCart()}
});

document.querySelectorAll("[data-close]").forEach(button=>button.addEventListener("click",()=>closeOverlay(button.dataset.close)));
document.querySelectorAll(".overlay").forEach(overlay=>{
 overlay.addEventListener("click",event=>{if(event.target===overlay)closeOverlay(overlay.id)});
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"){closeOverlay("productOverlay");closeOverlay("checkoutOverlay");closeCart()}
});

/* Отзывы — только реальные данные, полученные от сервера */

async function loadReviews(){
 const container=$("reviewList");
 const reviewEndpoint="https://lepi-orders.onrender.com/api/reviews";
 let allReviews=[];
 let shown=6;

 function renderReviews(){
  container.innerHTML=`
   <div class="review-list">${allReviews.slice(0,shown).map(review=>`
    <article class="review-card">
     <strong>${esc(review.name||"Покупатель LEPÍ")}</strong>
     <p>${esc(review.text||review.review_text||review.message||"")}</p>
     ${review.photo ? `<img src="${esc(review.photo)}" alt="Фото отзыва" loading="lazy" style="width:100%;height:auto;border-radius:12px;margin-top:10px;">` : ""}
    </article>
   `).join("")}</div>
   ${shown<allReviews.length ? `
    <button class="btn secondary" id="showMoreReviews" type="button" style="display:block;margin:24px auto 0;">
     Показать ещё
    </button>
   ` : ""}
  `;

  const button=$("showMoreReviews");
  if(button){
   button.addEventListener("click",()=>{
    shown+=6;
    renderReviews();
   });
  }
 }

 try{
  const response=await fetch(reviewEndpoint,{method:"GET"});
  if(!response.ok)throw new Error("Отзывы пока недоступны");

  const result=await response.json();
  allReviews=Array.isArray(result)?result:result.reviews;

  if(!Array.isArray(allReviews)||allReviews.length===0){
   container.innerHTML=`<div class="review-empty">Отзывы скоро появятся здесь. Пока их можно посмотреть в нашем Instagram.</div>`;
   return;
  }

  renderReviews();
 }catch(error){
  container.innerHTML=`<div class="review-empty">Отзывы пока не загружаются. Посмотрите отзывы покупателей в нашем Instagram.</div>`;
 }
}


$("year").textContent=new Date().getFullYear();
render();
renderBundles();
loadProductStatuses();
updateCart();
loadReviews();
