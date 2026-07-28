"use strict";

// ---------- Salud financiera (proyección, alertas y suscripciones) ----------
function daysInMonth(mo) {
  const [y, m] = mo.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

let healthSubs = [];

// Analiza el mes indicado y devuelve proyección, alertas por categoría y
// posibles suscripciones (gastos que se repiten).
function financialHealth(mo) {
  mo = mo || selectedMonth();
  const isCurrent = mo === curMonth();
  const dim = daysInMonth(mo);
  const day = isCurrent ? Math.min(new Date().getDate(), dim) : dim;
  const factor = day > 0 ? dim / day : 1;
  const exp = state.expenses.filter((e) => e.date.startsWith(mo));
  const spent = exp.reduce((s, e) => s + e.amount, 0);
  const projection = isCurrent && day < dim && spent > 0 ? spent * factor : null;

  // Alertas: categorías con presupuesto cuya proyección supera el límite.
  const budgets = state.config.categoryBudgets || {};
  const catSpent = {};
  exp.forEach((e) => (catSpent[e.cat] = (catSpent[e.cat] || 0) + e.amount));
  const forecasts = Object.keys(budgets)
    .filter((c) => budgets[c] > 0)
    .map((c) => {
      const s = catSpent[c] || 0;
      const proj = isCurrent ? s * factor : s;
      return { cat: c, spent: s, budget: budgets[c], proj, over: proj > budgets[c] };
    })
    .filter((f) => f.over && f.spent > 0);

  // Suscripciones: mismo importe (y nota) repetido en varios meses distintos y
  // que no esté ya registrado como gasto fijo.
  const groups = {};
  state.expenses.forEach((e) => {
    const noteKey = (e.note || "").trim().toLowerCase();
    (groups[e.amount.toFixed(2) + "|" + noteKey] ||= []).push(e);
  });
  const subs = [];
  Object.keys(groups).forEach((key) => {
    const arr = groups[key];
    const months = new Set(arr.map((e) => e.date.slice(0, 7)));
    const note = (arr[0].note || "").trim();
    if (months.size < (note ? 2 : 3)) return; // sin nota exigimos más repeticiones
    const amount = arr[0].amount;
    const dup = state.fixedExpenses.some(
      (fe) => Math.abs(fe.amount - amount) < 0.005 && (fe.note || "").trim().toLowerCase() === note.toLowerCase()
    );
    if (dup) return;
    const last = arr
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop();
    subs.push({
      amount,
      cat: last.cat,
      note,
      months: months.size,
      day: Math.min(28, Math.max(1, Number(last.date.slice(8, 10)) || 1)),
    });
  });
  subs.sort((a, b) => b.months - a.months);
  return { mo, isCurrent, spent, projection, forecasts, subs: subs.slice(0, 4) };
}

function renderHealth(mo) {
  const card = $("healthCard");
  const box = $("healthBox");
  if (!card || !box) return;
  const h = financialHealth(mo);
  healthSubs = h.subs;
  const parts = [];

  if (h.projection != null) {
    const budget = Number(state.config.budget) || 0;
    let extra = "";
    if (budget > 0) {
      extra =
        h.projection > budget
          ? ` — a este ritmo <b style="color:var(--danger)">superarás</b> tu presupuesto (${moneyShort(budget)})`
          : ` — dentro de tu presupuesto (${moneyShort(budget)}) 👍`;
    }
    parts.push(`<div class="health-row">📈 Proyección a fin de mes: <b>${moneyShort(h.projection)}</b>${extra}</div>`);
  }

  h.forecasts.forEach((f) => {
    parts.push(
      `<div class="health-row warn">⚠️ <b>${esc(f.cat)}</b>: llevas ${moneyShort(f.spent)}; a este ritmo llegarás a ~${moneyShort(f.proj)} (límite ${moneyShort(f.budget)}).</div>`
    );
  });

  if (h.subs.length) {
    parts.push(`<div class="section-title" style="margin-top: 10px">🔁 Posibles suscripciones</div>`);
    h.subs.forEach((s, i) => {
      const label = `${moneyShort(s.amount)}${s.note ? " · " + esc(s.note) : " · " + esc(s.cat)} <span class="muted">(en ${s.months} meses)</span>`;
      parts.push(
        `<div class="rt"><span style="flex: 1 1 auto">${label}</span><button class="ghost grow0" data-add-sub="${i}">Añadir como fijo</button></div>`
      );
    });
  }

  card.hidden = !parts.length;
  box.innerHTML = parts.join("");
}

if ($("healthBox")) {
  $("healthBox").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add-sub]");
    if (!b) return;
    const s = healthSubs[Number(b.dataset.addSub)];
    if (!s) return;
    state.fixedExpenses.push({ id: uid(), amount: s.amount, cat: s.cat, note: s.note, day: s.day });
    save();
    renderFixedExpenses();
    renderHealth();
    toast("Añadido a gastos fijos.", { type: "ok" });
  });
}
