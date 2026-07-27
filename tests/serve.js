"use strict";
// Servidor para los tests: sirve la app y emula los endpoints de Supabase que usa
// js/cloud.js, de modo que las pruebas NUNCA tocan un proyecto real. Inyecta una
// configuración de nube de prueba que apunta a este mismo servidor.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = parseInt(process.env.PORT || "4173", 10);
const ORIGIN = `http://localhost:${PORT}`;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
// JWT de prueba (payload sin firma real; el mock no la valida).
const ACCESS_TOKEN = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "user-test", email: "test@example.com" })}.sig`;

const store = { data: null, updated_at: null };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function body(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;

  if (p === "/auth/v1/otp") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end("{}");
  }
  if (p === "/auth/v1/user") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ id: "user-test", email: "test@example.com" }));
  }
  if (p === "/auth/v1/token") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ access_token: ACCESS_TOKEN, refresh_token: "r2", expires_in: 3600 }));
  }
  if (p === "/rest/v1/backups") {
    if (req.method === "POST") {
      const row = JSON.parse((await body(req)) || "[{}]")[0] || {};
      store.data = row.data;
      store.updated_at = row.updated_at || new Date().toISOString();
      res.writeHead(201, { "Content-Type": "application/json" });
      return res.end("");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(store.data ? JSON.stringify([{ data: store.data, updated_at: store.updated_at }]) : "[]");
  }
  // El endpoint de reseteo del mock, para aislar tests.
  if (p === "/__reset") {
    store.data = null;
    store.updated_at = null;
    res.writeHead(200);
    return res.end("ok");
  }

  // Config de nube inyectada: apunta al propio servidor de test.
  if (p === "/js/supabase-config.js") {
    res.writeHead(200, { "Content-Type": MIME[".js"] });
    return res.end(`"use strict";\nconst SUPABASE_URL="${ORIGIN}";\nconst SUPABASE_ANON_KEY="anon-test";\n`);
  }

  // Estáticos.
  const file = p === "/" ? "/index.html" : p;
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  fs.readFile(full, (err, buf) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
    res.end(buf);
  });
});

server.listen(PORT, () => console.log(`test server on ${ORIGIN}`));
