"use strict";

// ---------- Calendario ----------
let calMonth = curMonth();
function renderCalendar() {
  const [y, m] = calMonth.split("-").map(Number);
  $("calLabel").textContent = new Date(y, m - 1, 1).toLocaleDateString("es", { month: "long", year: "numeric" });
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-cell empty-cell"></div>');
  for (let d = 1; d <= days; d++) {
    const key = `${calMonth}-${pad(d)}`;
    const exp = state.expenses.filter((e) => e.date === key).reduce((s, e) => s + e.amount, 0);
    const habCount = state.habits.filter((h) => h.log[key]).length;
    const w = state.weatherLog[key];
    cells.push(`<div class="cal-cell ${key === todayStr ? "today" : ""}" data-cal-day="${key}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span class="cd-num">${d}</span>${w ? `<span class="cd-temp">${w.max}°</span>` : ""}</div>
      <div class="cd-marks">
        ${exp > 0 ? `<span class="cd-exp">${moneyShort(exp)}</span>` : ""}
        ${habCount > 0 ? `<span class="cd-hab">🔥${habCount}</span>` : ""}</div></div>`);
  }
  $("calGrid").innerHTML = cells.join("");
  fetchHistoryForMonth(calMonth);
}
function openDay(key) {
  const [Y, M, D] = key.split("-").map(Number);
  const dObj = new Date(Y, M - 1, D);
  $("modalTitle").textContent = dObj.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const w = state.weatherLog[key];
  const exps = state.expenses.filter((e) => e.date === key).sort((a, b) => b.amount - a.amount);
  const expTotal = exps.reduce((s, e) => s + e.amount, 0);
  const tasks = state.tasks.filter((t) => t.date === key);
  const habs = state.habits.filter((h) => h.log[key]);
  let html = "";
  if (w) {
    const [ic, txt] = WCODE[w.code] || ["🌡️", "—"];
    html += `<div class="md-weather">${ic} <b>${txt}</b> · máx ${w.max}° · mín ${w.min}°</div>`;
  } else html += `<div class="md-weather muted">Sin registro de clima para este día.</div>`;
  html += `<div class="md-sec"><div class="md-h">💰 Gastos <span>${money(expTotal)}</span></div>`;
  html += exps.length
    ? exps
        .map(
          (e) =>
            `<div class="md-row"><span class="cat-dot" style="background:${catColor(e.cat)}"></span>${esc(e.note) || esc(e.cat)}<span class="md-amt">${money(e.amount)}</span></div>`
        )
        .join("")
    : `<div class="md-empty">Sin gastos.</div>`;
  html += `</div>`;
  html += `<div class="md-sec"><div class="md-h">✅ Tareas</div>`;
  html += tasks.length
    ? tasks
        .map(
          (t) =>
            `<div class="md-row">${t.done ? "✔️" : "⬜"} <span style="${t.done ? "color:var(--muted);text-decoration:line-through;" : ""}">${esc(t.text)}</span> <span class="pill ${esc(t.prio)}" style="margin-left:auto;">${esc(t.prio)}</span></div>`
        )
        .join("")
    : `<div class="md-empty">Sin tareas.</div>`;
  html += `</div>`;
  html += `<div class="md-sec"><div class="md-h">🔥 Hábitos cumplidos</div>`;
  html += habs.length
    ? habs.map((h) => `<div class="md-row">✅ ${esc(h.name)}</div>`).join("")
    : `<div class="md-empty">Ninguno.</div>`;
  html += `</div>`;
  $("modalBody").innerHTML = html;
  $("modal").classList.add("open");
}
function closeModal() {
  $("modal").classList.remove("open");
}

// ---------- Calendario ----------
$("calPrev").addEventListener("click", () => {
  calMonth = shiftMonth(calMonth, -1);
  renderCalendar();
});
$("calNext").addEventListener("click", () => {
  calMonth = shiftMonth(calMonth, 1);
  renderCalendar();
});
$("calGrid").addEventListener("click", (e) => {
  const c = e.target.closest("[data-cal-day]");
  if (c) openDay(c.dataset.calDay);
});
$("modalClose").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDrawer();
  }
});
