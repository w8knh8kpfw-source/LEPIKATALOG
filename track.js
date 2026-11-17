
"use strict";
const API="https://lepi-orders.onrender.com/api/track",token=new URLSearchParams(location.search).get("token")||"";
const labels={new:"Заказ получен",accepted:"Принят в работу",preparing:"Готовим ваш заказ",ready:"Заказ готов",courier:"Передан курьеру",completed:"Заказ завершён",cancelled:"Заказ отменён"};
const stages=[
 {key:"new",title:"Заказ получен",note:"Мы получили ваш заказ",icon:'<path d="M8 4.5h7l4 4v11H8z" fill="currentColor" opacity=".12"/><path d="M8 4.5h7l4 4v11H8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15 4.8v4h4M11 12h5M11 15.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 8v13h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>'},
 {key:"accepted",title:"Подтверждение заказа",note:"Заказ принят командой LEPÍ",icon:'<rect x="5" y="5" width="14" height="14" rx="4" fill="currentColor" opacity=".12"/><path d="M8.5 12.2 11 14.7l5-5.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3.8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>'},
 {key:"preparing",title:"Приготовление",note:"Ваш заказ готовится",icon:'<path d="M5 11h14l-1.1 8H6.1z" fill="currentColor" opacity=".12"/><path d="M5 11h14l-1.1 8H6.1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 11h16M8 8.5c-1-1 .8-1.7 0-2.8M12 8.5c-1-1 .8-1.7 0-2.8M16 8.5c-1-1 .8-1.7 0-2.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 15h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>'},
 {key:"ready",title:"Заказ готов",note:"Всё собрано и подготовлено",icon:'<path d="m4.5 9 7.5-4 7.5 4v8l-7.5 4-7.5-4z" fill="currentColor" opacity=".12"/><path d="m4.5 9 7.5-4 7.5 4v8l-7.5 4-7.5-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4.8 9.2 12 13l7.2-3.8M12 13v8M9 7l7.2 3.8" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="m9.2 15.2 1.8 1.8 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'},
 {key:"courier",title:"Передан курьеру",note:"Заказ отправился к вам",icon:'<path d="M3.5 7h10v10h-10z" fill="currentColor" opacity=".12"/><path d="M3.5 7h10v10h-10zM13.5 10h4l3 3v4h-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="2" fill="currentColor" opacity=".18"/><circle cx="17.2" cy="18" r="2" fill="currentColor" opacity=".18"/><circle cx="7.5" cy="18" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="17.2" cy="18" r="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M15 12h2.2l1.6 1.8H15z" fill="currentColor" opacity=".4"/>'},
 {key:"completed",title:"Доставлен",note:"Заказ успешно завершён",icon:'<path d="M4.5 11.5 12 5l7.5 6.5v7h-15z" fill="currentColor" opacity=".12"/><path d="M4.5 11.5 12 5l7.5 6.5v7h-15z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 19v-5h6v5M9.2 11.8l1.8 1.8 3.9-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'}
];
const pickupStages=stages.filter(stage=>stage.key!=="courier").map(stage=>{
 if(stage.key==="ready")return {...stage,title:"Готов к самовывозу",note:"Можно забрать ваш заказ"};
 if(stage.key==="completed")return {...stage,title:"Забран клиентом",note:"Заказ успешно получен"};
 return stage;
});
function stageIcon(paths){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>'}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function date(v){try{return new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v))}catch{return ""}}
async function load(){
 const el=document.getElementById("content");
 if(!/^[a-f0-9]{48}$/.test(token)){el.innerHTML="<strong>Ссылка недействительна</strong>Проверьте, что вы открыли ссылку из сообщения после оформления заказа.";return}
 try{
  const r=await fetch(API+"?token="+encodeURIComponent(token),{cache:"no-store"});
  if(r.status===404){el.innerHTML="<strong>Заказ не найден</strong>Возможно, ссылка указана неверно.";return}
  if(!r.ok)throw new Error("Tracking unavailable");
  const o=(await r.json()).order||{},mode=o.fulfillmentType,activeStages=mode==="pickup"?pickupStages:stages,step=activeStages.findIndex(x=>x.key===o.status),cancelled=o.status==="cancelled",items=Array.isArray(o.items)?o.items:[];
  const completedIndex=o.status==="completed"?activeStages.length-1:step;
  const stageMarkup=activeStages.map((stage,i)=>{
   const done=!cancelled&&i<completedIndex,current=!cancelled&&i===completedIndex;
   return '<div class="stage '+(done?'done ': '')+(current?'current':'')+'"><div class="stage-icon">'+stageIcon(stage.icon)+'</div><div class="stage-copy"><div class="stage-title">'+stage.title+'</div><div class="stage-note">'+(current?'Текущий этап · ': '')+stage.note+'</div></div></div>';
  }).join("");
  const completedCount=cancelled?0:(o.status==="completed"?activeStages.length:Math.max(0,completedIndex));
  const statusLabel=!mode?"Ожидаем подтверждения способа получения":(mode==="pickup"&&o.status==="completed"?"Заказ забран":labels[o.status]||"Статус обновляется");
  const timelineBlock=!mode?'<div class="error" style="margin:8px 0 22px"><strong>Уточняем способ получения</strong>Команда LEPÍ скоро выберет доставку или самовывоз. Этапы заказа появятся здесь автоматически.</div>':(cancelled?'<div class="cancelled-panel">'+stageIcon('<path d="m8 8 8 8M16 8l-8 8"/><circle cx="12" cy="12" r="9"/>')+'<span>Этот заказ отменён. Если у вас есть вопросы, свяжитесь с командой LEPÍ.</span></div>':'<div class="progress-head"><span class="progress-label">Этапы заказа</span><span class="progress-count">'+completedCount+' / '+activeStages.length+' завершено</span></div><div class="timeline">'+stageMarkup+'</div>');
  el.className="paper";
  el.innerHTML='<div class="order-meta"><div class="order-no">№ '+esc(o.orderNumber)+'</div><div class="updated">Обновлено: '+esc(date(o.updatedAt))+'</div></div>'+
   '<div class="status" '+(cancelled?'style="background:#f3e4e1;color:#9b514a"':'')+'>'+esc(statusLabel)+'</div>'+
   timelineBlock+
   '<div class="section-title">Состав заказа</div><div class="items">'+items.map(x=>'<div class="item"><span>'+esc(x.name||x.title||"Товар")+' · '+esc(x.quantity||1)+' шт.</span><b>'+esc(x.price??"")+(String(x.price??"").includes("сомони")?"":" сомони")+'</b></div>').join("")+'</div>'+
   '<div class="total"><span>Итого за товары</span><span>'+esc(o.total)+'</span></div>'+
   '<p class="info">Заказ оформлен: '+esc(date(o.createdAt))+'<br>'+(mode==="pickup"?"Самовывоз: дождитесь статуса «Готов к самовывозу», прежде чем приезжать за заказом.":"Доставка оплачивается отдельно.")+' Для уточнения деталей с вами свяжется представитель LEPÍ. Телефон и адрес на этой странице не отображаются.</p>';
 }catch(e){el.className="error";el.innerHTML="<strong>Не удалось загрузить заказ</strong>Проверьте интернет и обновите страницу."}
}
load();setInterval(load,20000);
