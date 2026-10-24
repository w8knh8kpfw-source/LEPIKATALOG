

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const CHAT_IDS = [
  process.env.CHAT_ID_1,
  process.env.CHAT_ID_2
].filter(Boolean);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const REVIEWS_FILE =
  process.env.REVIEWS_FILE || "/data/reviews.json";

let polling = false;
let offset = 0;
let reviewQueue = Promise.resolve();

function readReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function saveReviews(reviews) {
  fs.mkdirSync(path.dirname(REVIEWS_FILE), { recursive: true });

  const tempFile = REVIEWS_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(reviews, null, 2));
  fs.renameSync(tempFile, REVIEWS_FILE);
}

function queueReviewTask(task) {
  const result = reviewQueue.then(task);
  reviewQueue = result.catch(error =>
    console.error("Review storage error:", error.message)
  );
  return result;
}

async function telegram(method, data = {}) {
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

function isAdmin(chatId, userId) {
  return CHAT_IDS.includes(String(chatId)) &&
    CHAT_IDS.includes(String(userId));
}

async function sendText(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

async function showReviews(chatId) {
  const reviews = await queueReviewTask(() => readReviews());

  if (!reviews.length) {
    return sendText(chatId, "Пока отзывов нет.", {
      reply_markup: {
        keyboard: [[{ text: "Отзывы" }]],
        resize_keyboard: true
      }
    });
  }

  await sendText(chatId, `Всего отзывов: ${reviews.length}`);

  for (const review of reviews) {
    const caption = [
      `👤 ${review.name}`,
      "",
      review.text,
      "",
      `ID: ${review.id}`
    ].join("\n").slice(0, 1000);

    const keyboard = {
      inline_keyboard: [[
        {
          text: "🗑 Удалить",
          callback_data: `del:${review.id}`
        }
      ]]
    };

    if (review.photo) {
      await telegram("sendPhoto", {
        chat_id: chatId,
        photo: review.photo,
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
        "LEPÍ — управление отзывами.\n\n" +
        "Отправь фотографию с подписью:\n" +
        "первая строка — имя клиента\n" +
        "вторая и следующие строки — отзыв.\n\n" +
        "Нажми «Отзывы», чтобы посмотреть и удалить отзывы.",
        {
          reply_markup: {
            keyboard: [[{ text: "Отзывы" }]],
            resize_keyboard: true
          }
        }
      );
    }

    if (text === "Отзывы" || text === "/reviews") {
      return showReviews(chatId);
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

      const photo = message.photo[message.photo.length - 1].file_id;

      const review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.slice(0, 100),
        text: reviewText.slice(0, 3000),
        photo,
        createdAt: new Date().toISOString()
      };

      await queueReviewTask(() => {
        const reviews = readReviews();
        reviews.push(review);
        saveReviews(reviews);
      });

      return sendText(chatId, `✅ Отзыв ${name} сохранён.`);
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

  const match = /^del:(.+)$/.exec(callback.data || "");

  if (!match) {
    return telegram("answerCallbackQuery", {
      callback_query_id: callback.id
    });
  }

  const reviewId = match[1];

  const deleted = await queueReviewTask(() => {
    const reviews = readReviews();
    const remaining = reviews.filter(item => item.id !== reviewId);

    if (remaining.length === reviews.length) return false;

    saveReviews(remaining);
    return true;
  });

  await telegram("answerCallbackQuery", {
    callback_query_id: callback.id,
    text: deleted ? "Отзыв удалён." : "Отзыв уже не найден."
  });

  if (deleted) {
    try {
      await telegram("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: callback.message.message_id,
        reply_markup: { inline_keyboard: [] }
      });
    } catch (error) {
      console.error("Could not update review message:", error.message);
    }
  }
}

async function pollTelegram() {
  if (polling || !BOT_TOKEN || CHAT_IDS.length !== 2) return;
  polling = true;

  try {
    // Этот режим использует long polling, а не webhook.
    await telegram("deleteWebhook", { drop_pending_updates: false });

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
            console.error("Telegram update error:", error.message);
          }
        }
      } catch (error) {
        console.error("Telegram polling error:", error.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error("Telegram bot startup error:", error.message);
  } finally {
    polling = false;
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (origin && ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: "Origin not allowed" }));
  }

  if (origin && ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Публичный список отзывов для сайта.
  if (req.method === "GET" && req.url === "/api/reviews") {
    try {
      const reviews = await queueReviewTask(() => readReviews());

      res.writeHead(200, {
        "Cache-Control": "no-store"
      });

      return res.end(JSON.stringify({
        reviews: reviews.map(({ id, name, text, photo, createdAt }) => ({
          id, name, text, photo, createdAt
        }))
      }));
    } catch (error) {
      console.error("Could not read reviews:", error.message);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: "Could not load reviews" }));
    }
  }

  if (req.method !== "POST" || req.url !== "/api/order") {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  if (!BOT_TOKEN || CHAT_IDS.length !== 2 || !ALLOWED_ORIGIN) {
    console.error("Configuration error: check required environment variables");
    res.writeHead(500);
    return res.end(JSON.stringify({ error: "Server not configured" }));
  }

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk;

      if (body.length > 20000) {
        res.writeHead(413);
        return res.end(JSON.stringify({ error: "Order too large" }));
      }
    }

    const order = JSON.parse(body);

    const name = String(order.name || "").trim();
    const phone = String(order.phone || "").trim();
    const address = String(order.address || "").trim();
    const comment = String(order.comment || "").trim();
    const items = order.items;
    const total = String(order.total ?? "").trim();

    if (!name || !phone || !Array.isArray(items) || items.length === 0) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Missing order details" }));
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
      `💬 Комментарий: ${comment || "Нет"}`
    ].join("\n");

    const results = await Promise.all(
      CHAT_IDS.map(async (chatId, index) => {
        try {
          const result = await telegram("sendMessage", {
            chat_id: chatId,
            text: message
          });

          return Boolean(result.message_id);
        } catch (error) {
          console.error(`Order delivery failed for recipient ${index + 1}:`, error.message);
          return false;
        }
      })
    );

    if (results.every(Boolean)) {
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true }));
    }

    res.writeHead(502);
    return res.end(JSON.stringify({
      error: "Could not deliver order to all recipients"
    }));
  } catch (error) {
    console.error("Order processing failed:", error.message);
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Invalid order request" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LEPI orders server listening on ${PORT}`);
  pollTelegram();
});
