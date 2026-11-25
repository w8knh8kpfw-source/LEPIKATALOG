import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://yviikxucweyacecwbfmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ko-e9S6lmqEOmYqhoNQKrQ_eWBeqXIc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const FAVORITES_KEY = "lepi-favorites-v1";
const PROFILE_KEY = "lepi-customer-v1";
const ORDER_API = "https://lepi-orders.onrender.com/api/account/orders";
const $ = (id) => document.getElementById(id);
let currentSession = null;
let favoriteIds = readFavorites();

function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch { return []; }
}
function writeFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  refreshFavoriteButtons();
}
function refreshFavoriteButtons() {
  document.querySelectorAll("[data-fav]").forEach((button) => {
    const active = favoriteIds.includes(button.dataset.fav);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "♥" : "♡";
    button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
  });
}
async function toggleFavorite(productId) {
  if (!productId) return;
  const exists = favoriteIds.includes(productId);
  favoriteIds = exists ? favoriteIds.filter((id) => id !== productId) : [...favoriteIds, productId];
  writeFavorites();
  if (currentSession) {
    try {
      if (exists) await supabase.from("favorites").delete().eq("user_id", currentSession.user.id).eq("product_id", productId);
      else await supabase.from("favorites").upsert({ user_id: currentSession.user.id, product_id: productId }, { onConflict: "user_id,product_id" });
    } catch (error) { console.warn("Не удалось синхронизировать избранное:", error.message); }
  }
  if ($("favoritesList")) renderFavorites();
}
function saveCustomerCache(name, phone) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone })); } catch {}
}
async function signIn(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + "/account.html" }
  });
  if (error) showMessage(provider === "custom:telegram"
    ? "Telegram пока не настроен в LEPÍ. Сначала нужно подключить Telegram Login в Supabase."
    : "Не удалось начать вход. Проверьте, включён ли этот способ входа в настройках LEPÍ.");
}
function showMessage(message, isError = true) {
  const node = $("profileAccountMessage") && !$("profilePanel")?.hidden ? $("profileAccountMessage") : $("loginMessage");
  if (!node) { alert(message); return; }
  node.textContent = message;
  node.className = "account-message" + (isError ? " error" : " success");
  node.hidden = false;
}
async function loadFavorites() {
  if (!currentSession) return;
  const guestFavorites = readFavorites();
  if (guestFavorites.length) await supabase.from("favorites").upsert(guestFavorites.map((product_id) => ({ user_id: currentSession.user.id, product_id })), { onConflict: "user_id,product_id", ignoreDuplicates: true });
  const { data, error } = await supabase.from("favorites").select("product_id").eq("user_id", currentSession.user.id);
  if (!error && Array.isArray(data)) {
    favoriteIds = data.map((row) => row.product_id);
    writeFavorites();
  }
}
function renderFavorites() {
  const node = $("favoritesList");
  if (!node) return;
  const names = {
    chicken: "Куриные котлеты с овощами", classic: "Сырники классические", choco: "Сырники шоколадные",
    rafaello: "Сырники «Рафаэлло»", varenko: "Сырники с варёнкой", beef: "Говяжьи котлеты",
    meatp: "Блинчики с мясом", curdp: "Блинчики с творогом", condensed: "Блинчики с варёной сгущёнкой",
    apple: "Блинчики с яблоком и корицей", chopped: "Рубленые куриные котлеты", meatballs: "Фрикадельки"
  };
  node.innerHTML = favoriteIds.length
    ? favoriteIds.map((id) => '<div class="account-list-row"><span>♡</span><b>' + escapeHtml(names[id] || id) + '</b><button class="text-button" data-remove-fav="' + escapeHtml(id) + '">Убрать</button></div>').join("")
    : '<p class="account-muted">Пока ничего не добавлено. Нажимайте ♡ на карточках блюд в каталоге.</p>';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
}
async function loadOrders() {
  const node = $("ordersList");
  if (!node || !currentSession) return;
  node.innerHTML = '<p class="account-muted">Загружаем историю заказов…</p>';
  try {
    const response = await fetch(ORDER_API, { headers: { Authorization: "Bearer " + currentSession.access_token } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы");
    if (!result.orders?.length) {
      node.innerHTML = '<p class="account-muted">Здесь появятся ваши заказы, оформленные после регистрации.</p>';
      return;
    }
    node.innerHTML = result.orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemText = items.map((item) => escapeHtml(item.name) + " × " + Number(item.quantity || 0)).join(", ");
      const date = new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
      const status = ({new:"Получен",accepted:"Принят",preparing:"Готовится",ready:"Готов",courier:"Передан курьеру",completed:"Завершён",cancelled:"Отменён"})[order.status] || "Обновляется";
      return '<article class="order-card"><div class="order-top"><b>' + escapeHtml(order.order_number) + '</b><span>' + date + '</span></div><div class="order-status">' + status + '</div><p>' + itemText + '</p><div class="order-bottom"><strong>' + escapeHtml(order.total) + '</strong><div><button class="text-button" data-repeat="' + escapeHtml(order.id) + '">Повторить заказ</button><a class="text-button" href="' + escapeHtml(order.trackingUrl) + '" target="_blank" rel="noopener">Отследить</a></div></div></article>';
    }).join("");
  } catch (error) {
    node.innerHTML = '<p class="account-muted">История заказов временно недоступна. ' + escapeHtml(error.message) + '</p>';
  }
}
async function loadProfile() {
  if (!currentSession) return;
  const { data } = await supabase.from("profiles").select("full_name,phone").eq("id", currentSession.user.id).maybeSingle();
  const meta = currentSession.user.user_metadata || {};
  const name = data?.full_name || meta.full_name || meta.name || "";
  const phone = data?.phone || "";
  if ($("profileName")) $("profileName").value = name;
  if ($("profilePhone")) $("profilePhone").value = phone;
  if ($("accountEmail")) $("accountEmail").textContent = currentSession.user.email || "Аккаунт подключён";
  saveCustomerCache(name, phone);
}
async function saveProfile(event) {
  event.preventDefault();
  if (!currentSession) return;
  const full_name = $("profileName").value.trim();
  const phone = $("profilePhone").value.trim();
  if (full_name.length < 2 || phone.replace(/\D/g, "").length < 7) {
    showMessage("Укажите имя и корректный номер телефона.");
    return;
  }
  const { error } = await supabase.from("profiles").upsert({ id: currentSession.user.id, full_name, phone, updated_at: new Date().toISOString() });
  if (error) return showMessage("Не удалось сохранить профиль: " + error.message);
  saveCustomerCache(full_name, phone);
  showMessage("Данные профиля сохранены.", false);
}
function renderAccount() {
  const loggedIn = !!currentSession;
  if ($("loginPanel")) $("loginPanel").hidden = loggedIn;
  if ($("profilePanel")) $("profilePanel").hidden = !loggedIn;
  if ($("favoritesPanel")) $("favoritesPanel").hidden = !loggedIn;
  if ($("ordersPanel")) $("ordersPanel").hidden = !loggedIn;
  if (loggedIn) {
    loadProfile();
    loadFavorites();
    loadOrders();
  }
}
async function init() {
  const { data } = await supabase.auth.getSession();
  currentSession = data.session;
  renderAccount();
  refreshFavoriteButtons();
  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    renderAccount();
  });
}
if ($("accountPage")) {
  document.querySelectorAll("[data-provider]").forEach((button) => button.addEventListener("click", () => signIn(button.dataset.provider)));
  $("profileForm")?.addEventListener("submit", saveProfile);
  $("signOut")?.addEventListener("click", async () => { await supabase.auth.signOut(); window.location.reload(); });
  $("guestContinue")?.addEventListener("click", () => { window.location.href = "index.html"; });
  $("favoritesList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-fav]");
    if (button) toggleFavorite(button.dataset.removeFav);
  });
  $("ordersList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-repeat]");
    if (!button || !currentSession) return;
    const response = await fetch(ORDER_API, { headers: { Authorization: "Bearer " + currentSession.access_token } });
    const result = await response.json();
    const saved = result.orders?.find((item) => item.id === button.dataset.repeat);
    if (!saved) return showMessage("Не удалось найти этот заказ.");
    const cart = {};
    (saved.items || []).forEach((item) => { if (item.id && Number.isInteger(item.quantity)) cart[item.id] = item.quantity; });
    if (!Object.keys(cart).length) return showMessage("В этом заказе нет доступных для повтора позиций.");
    localStorage.setItem("lepi-cart-v1", JSON.stringify(cart));
    window.location.href = "index.html#catalog";
  });
}
window.LEPI_ACCOUNT = {
  toggleFavorite,
  refreshFavoriteButtons,
  isFavorite: (id) => favoriteIds.includes(id),
  getProfile: () => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch { return {}; } },
  getAccessToken: () => currentSession?.access_token || null
};
init();
