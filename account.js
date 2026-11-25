import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const SUPABASE_URL = "https://yviikxucweyacecwbfmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ko-e9S6lmqEOmYqhoNQKrQ_eWBeqXIc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const FAVORITES_KEY = "lepi-favorites-v1";
const PROFILE_KEY = "lepi-customer-v1";
const ORDER_API = "https://lepi-orders.onrender.com/api/account/orders";
const $ = (id) => document.getElementById(id);
let currentSession = null;
let favoriteIds = readFavorites();

const PRODUCT_NAMES = {
  chicken:"Куриные котлеты с овощами", classic:"Сырники классические",
  choco:"Сырники шоколадные", rafaello:"Сырники «Рафаэлло»",
  varenko:"Сырники с варёнкой", beef:"Говяжьи котлеты",
  meatp:"Блинчики с мясом", curdp:"Блинчики с творогом",
  condensed:"Блинчики с варёной сгущёнкой", apple:"Блинчики с яблоком и корицей",
  chopped:"Рубленые куриные котлеты", meatballs:"Фрикадельки"
};
const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 8.8c0 5.1-8.2 10.1-8.2 10.1S3.8 13.9 3.8 8.8a4.3 4.3 0 0 1 8.2-1.7 4.3 4.3 0 0 1 8.2 1.7Z"/></svg>';

function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch { return []; }
}
function writeFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds)); } catch {}
  refreshFavoriteButtons();
}
function refreshFavoriteButtons() {
  document.querySelectorAll("[data-fav]").forEach((button) => {
    const active = favoriteIds.includes(button.dataset.fav);
    button.setAttribute("aria-pressed", String(active));
    button.innerHTML = HEART_SVG;
    button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
  });
}
async function toggleFavorite(productId) {
  if (!productId) return;
  const exists = favoriteIds.includes(productId);
  favoriteIds = exists ? favoriteIds.filter((id) => id !== productId) : [...favoriteIds, productId];
  writeFavorites();
  if (currentSession) {
    const result = exists
      ? await supabase.from("favorites").delete().eq("user_id", currentSession.user.id).eq("product_id", productId)
      : await supabase.from("favorites").upsert({ user_id: currentSession.user.id, product_id: productId }, { onConflict: "user_id,product_id" });
    if (result.error) console.warn("Не удалось синхронизировать избранное:", result.error.message);
  }
  if ($("favoritesList")) renderFavorites();
}
function saveCustomerCache(name, phone) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone })); } catch {}
}
function showMessage(message, isError = true) {
  const profileVisible = $("profilePanel") && !$("profilePanel").hidden;
  const node = profileVisible ? $("profileAccountMessage") : $("loginMessage");
  if (!node) return;
  node.textContent = message;
  node.className = "account-message " + (isError ? "error" : "success");
  node.hidden = false;
}
async function signIn(provider) {
  const button = document.querySelector('[data-provider="' + provider + '"]');
  const label = provider === "custom:telegram" ? "Telegram" : provider === "apple" ? "Apple" : "Google";
  if (button) button.disabled = true;
  const message = $("loginMessage");
  if (message) message.hidden = true;
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "https://lepikatalog.onrender.com/account.html",
        ...(provider === "custom:telegram" ? { scopes: "openid profile" } : {})
      }
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Supabase не вернул адрес авторизации");
  } catch (error) {
    console.error("LEPI OAuth " + label + ":", error);
    const detail = String(error?.message || "").toLowerCase();
    let hint = "Не удалось запустить вход через " + label + ".";
    if (detail.includes("provider is not enabled") || detail.includes("unsupported provider")) {
      hint += " Этот способ входа ещё не включён в Supabase.";
    } else if (detail.includes("redirect")) {
      hint += " Проверьте разрешённый адрес возврата в настройках Supabase.";
    } else {
      hint += " " + (error?.message || "Проверьте настройки провайдера в Supabase.");
    }
    showMessage(hint);
    if (button) button.disabled = false;
  }
}
async function loadFavorites() {
  if (!currentSession) return;
  const guestFavorites = readFavorites();
  if (guestFavorites.length) {
    const merged = await supabase.from("favorites").upsert(
      guestFavorites.map((product_id) => ({ user_id: currentSession.user.id, product_id })),
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );
    if (merged.error) console.warn("Не удалось объединить избранное:", merged.error.message);
  }
  const { data, error } = await supabase.from("favorites")
    .select("product_id").eq("user_id", currentSession.user.id);
  if (error) return showMessage("Не удалось загрузить избранное. Попробуйте обновить страницу.");
  if (Array.isArray(data)) {
    favoriteIds = data.map((row) => row.product_id);
    writeFavorites();
  }
  renderFavorites();
}
function renderFavorites() {
  const node = $("favoritesList");
  if (!node) return;
  node.innerHTML = favoriteIds.length
    ? favoriteIds.map((id) => '<div class="account-list-row">' + HEART_SVG +
      '<b>' + escapeHtml(PRODUCT_NAMES[id] || id) + '</b>' +
      '<button class="text-button" type="button" data-remove-fav="' + escapeHtml(id) + '">Убрать</button></div>').join("")
    : '<p class="account-muted">Пока ничего не добавлено. Выберите блюда в каталоге, нажав на небольшую иконку избранного.</p>';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}
async function loadOrders() {
  const node = $("ordersList");
  if (!node || !currentSession) return;
  node.innerHTML = '<p class="account-muted">Загружаем историю заказов…</p>';
  try {
    const response = await fetch(ORDER_API, {
      headers: { Authorization: "Bearer " + currentSession.access_token },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы");
    if (!result.orders?.length) {
      node.innerHTML = '<p class="account-muted">Здесь появятся ваши заказы, оформленные после входа в аккаунт.</p>';
      return;
    }
    node.innerHTML = result.orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemText = items.map((item) =>
        escapeHtml(item.name) + " × " + Number(item.quantity || 0)
      ).join(", ");
      const date = new Date(order.created_at).toLocaleDateString("ru-RU", {
        day:"numeric", month:"long", year:"numeric"
      });
      const status = ({
        new:"Получен", accepted:"Принят", preparing:"Готовится", ready:"Готов",
        courier:"Передан курьеру", completed:"Завершён", cancelled:"Отменён"
      })[order.status] || "Обновляется";
      return '<article class="order-card" data-order-id="' + escapeHtml(order.id) + '">' +
        '<div class="order-top"><b>' + escapeHtml(order.order_number) + '</b><span>' + date + '</span></div>' +
        '<div class="order-status">' + status + '</div><p>' + itemText + '</p>' +
        '<div class="order-bottom"><strong>' + escapeHtml(order.total) + '</strong><div>' +
        '<button class="text-button" type="button" data-repeat="' + escapeHtml(order.id) + '">Повторить заказ</button>' +
        '<a class="text-button" href="' + escapeHtml(order.trackingUrl) + '" target="_blank" rel="noopener">Отследить</a>' +
        '</div></div></article>';
    }).join("");
  } catch (error) {
    node.innerHTML = '<p class="account-muted">История заказов пока недоступна. ' + escapeHtml(error.message) + '</p>';
  }
}
function renderProfileView(name, phone) {
  const view = $("profileView");
  const form = $("profileForm");
  if ($("profileViewName")) $("profileViewName").textContent = name || "Имя не указано";
  if ($("profileViewPhone")) $("profileViewPhone").textContent = phone || "Телефон не указан";
  if (view) view.hidden = !(name && phone);
  if (form) form.hidden = !!(name && phone);
}
async function loadProfile() {
  if (!currentSession) return;
  const { data, error } = await supabase.from("profiles")
    .select("full_name,phone").eq("id", currentSession.user.id).maybeSingle();
  if (error) return showMessage("Не удалось загрузить данные профиля.");
  const meta = currentSession.user.user_metadata || {};
  const name = data?.full_name || meta.full_name || meta.name || "";
  const phone = data?.phone || "";
  if ($("profileName")) $("profileName").value = name;
  if ($("profilePhone")) $("profilePhone").value = phone;
  if ($("accountEmail")) $("accountEmail").textContent = currentSession.user.email || "Аккаунт подключён";
  saveCustomerCache(name, phone);
  renderProfileView(name, phone);
  if (!name || !phone) showMessage("Добавьте имя и номер телефона, чтобы профиль был готов к оформлению заказов.", false);
}
async function saveProfile(event) {
  event.preventDefault();
  if (!currentSession) return;
  const full_name = $("profileName").value.trim();
  const phone = $("profilePhone").value.trim();
  if (full_name.length < 2 || phone.replace(/\D/g, "").length < 7) {
    return showMessage("Укажите имя и корректный номер телефона.");
  }
  const { error } = await supabase.from("profiles").upsert({
    id: currentSession.user.id, full_name, phone, updated_at: new Date().toISOString()
  });
  if (error) return showMessage("Не удалось сохранить профиль. Проверьте соединение и попробуйте снова.");
  saveCustomerCache(full_name, phone);
  renderProfileView(full_name, phone);
  showMessage("Профиль успешно сохранён.", false);
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
async function repeatOrder(orderId) {
  if (!currentSession) return;
  try {
    const response = await fetch(ORDER_API, {
      headers: { Authorization: "Bearer " + currentSession.access_token },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось получить заказ");
    const order = result.orders?.find((item) => item.id === orderId);
    if (!order) throw new Error("Заказ не найден");
    const cart = {};
    (order.items || []).forEach((item) => {
      if (item.id && Number.isInteger(item.quantity)) cart[item.id] = item.quantity;
    });
    if (!Object.keys(cart).length) throw new Error("В заказе нет позиций для повтора");
    localStorage.setItem("lepi-cart-v1", JSON.stringify(cart));
    window.location.href = "index.html#catalog";
  } catch (error) { showMessage(error.message); }
}
async function init() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    currentSession = data.session;
    renderAccount();
    refreshFavoriteButtons();
    supabase.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
      renderAccount();
    });
  } catch (error) {
    console.error("LEPI account init:", error);
    showMessage("Не удалось подключиться к аккаунту. Проверьте интернет и попробуйте обновить страницу.");
  }
}
if ($("accountPage")) {
  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => signIn(button.dataset.provider));
  });
  $("profileForm")?.addEventListener("submit", saveProfile);
  $("editProfile")?.addEventListener("click", () => {
    if ($("profileView")) $("profileView").hidden = true;
    if ($("profileForm")) $("profileForm").hidden = false;
    $("profileName")?.focus();
  });
  $("signOut")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
  $("favoritesList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-fav]");
    if (button) toggleFavorite(button.dataset.removeFav);
  });
  $("ordersList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-repeat]");
    if (button) repeatOrder(button.dataset.repeat);
  });
}
window.LEPI_ACCOUNT = {
  toggleFavorite,
  refreshFavoriteButtons,
  getProfile: () => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
    catch { return {}; }
  },
  getAccessToken: () => currentSession?.access_token || null
};
init();
