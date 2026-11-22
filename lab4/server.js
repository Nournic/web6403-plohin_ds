"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
const topics = new Set(["internship", "project", "question", "other"]);

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function receiveBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk.toString("utf8");
    if (Buffer.byteLength(body, "utf8") > 16 * 1024) {
      const error = new Error("Слишком большой запрос");
      error.status = 413;
      throw error;
    }
  }
  return body;
}

async function contact(req, res) {
  try {
    const raw = await receiveBody(req);
    const type = req.headers["content-type"] || "";
    let data;
    if (type.includes("application/json")) data = JSON.parse(raw);
    else if (type.includes("application/x-www-form-urlencoded")) {
      const form = new URLSearchParams(raw);
      data = Object.fromEntries(form);
      data.consent = data.consent === "yes";
    } else return sendJson(res, 415, { error: "Используй JSON или HTML-форму" });

    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();
    const topic = String(data.topic ?? "");
    const message = String(data.message ?? "").trim();
    if (name.length < 2 || name.length > 80 ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !topics.has(topic) || message.length < 5 || message.length > 2000 ||
        data.consent !== true) {
      return sendJson(res, 400, { error: "Проверь обязательные поля формы" });
    }
    console.log("[contact]", new Date().toISOString(), { name, email, topic, message });
    if (type.includes("application/x-www-form-urlencoded")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end('<!doctype html><html lang="ru"><meta charset="utf-8"><title>Отправлено</title><body><h1>Сообщение принято</h1><p>Локальный демонстрационный сервер получил данные.</p><a href="/contact.html">Вернуться</a></body></html>');
    }
    return sendJson(res, 200, { ok: true, message: "Данные получены локальным сервером" });
  } catch (error) {
    return sendJson(res, error.status || 400, { error: "Некорректный запрос" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/api/contact") {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      return res.end("Method Not Allowed");
    }
    return contact(req, res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end("Method Not Allowed");
  }

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); return res.end("Bad Request"); }
  if (pathname === "/") pathname = "/index.html";
  const fullPath = path.resolve(ROOT, "." + pathname);
  if (pathname === "/server.js") {
    res.writeHead(404); return res.end("Файл не найден");
  }
  if (!fullPath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  try {
    const contents = await fs.readFile(fullPath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(fullPath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    return res.end(req.method === "HEAD" ? undefined : contents);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Файл не найден");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Лабораторная №4: http://localhost:${PORT}`);
});
