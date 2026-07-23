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
