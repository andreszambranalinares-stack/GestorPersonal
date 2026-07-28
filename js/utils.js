"use strict";

// ---------- Utilidades de fecha ----------
const pad = (n) => String(n).padStart(2, "0");
function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const todayStr = ymd(new Date());
function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function money(n) {
  return state.config.currency + n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function moneyShort(n) {
  return state.config.currency + Math.round(n).toLocaleString("es");
}
function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
// Notificación del sistema (si el usuario concedió permiso).
function notify(msg) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Panel Personal", { body: msg });
    } catch {
      /* sin notificación disponible */
    }
  }
}
// Resalte transitorio de la fila recién creada (por id de movimiento o tarea).
function flashNew(id) {
  const el = document.querySelector(`[data-del-exp="${id}"],[data-del-inc="${id}"],[data-task="${id}"]`);
  const row = el && el.closest(".item, .task");
  if (!row) return;
  row.classList.add("just-added");
  setTimeout(() => row.classList.remove("just-added"), 1000);
}
