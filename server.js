const http = require("http");

const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_IDS = [
  process.env.CHAT_ID_1,
  process.env.CHAT_ID_2
].filter(Boolean);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (origin && ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST" || req.url !== "/api/order") {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  if (!BOT_TOKEN || CHAT_IDS.length !== 2 || !ALLOWED_ORIGIN) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: "Server not configured" }));
  }

  let body = "";

  try {
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

    if (!name || !phone || !items ||
        (Array.isArray(items) && items.length === 0)) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Missing order details" }));
    }

    const itemText = Array.isArray(items)
      ? items.map(item => {
          if (typeof item === "string") return item;
          return [
            item.name || item.title || "Товар",
            item.quantity ? `× ${item.quantity}` : "",
            item.price != null ? ` — ${item.price}` : ""
          ].join("");
        }).join("\n")
      : String(items);

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
      CHAT_IDS.map(async chatId => {
        const response = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message
            })
          }
        );

        return response.ok;
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
});
