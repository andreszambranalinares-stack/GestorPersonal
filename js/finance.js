"use strict";

// ---------- Finanzas ----------
function renderCatSelect() {
  $("finCat").innerHTML = CATS.map((c) => `<option value="${c}">${c}</option>`).join("");
}
function selectedMonth() {
  return $("finMonth").value || curMonth();
}
function renderFinance() {
  const m = selectedMonth();
  const exp = state.expenses.filter((e) => e.date.startsWith(m));
  const inc = state.incomes.filter((e) => e.date.startsWith(m));
  const total = exp.reduce((s, e) => s + e.amount, 0);
  $("finTotal").textContent = money(total);
  const byCat = {};
  exp.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + e.amount));
  const groups = CATS.map((c, i) => ({ cat: c, idx: i, val: byCat[c] || 0 }))
    .filter((g) => g.val > 0)
    .sort((a, b) => b.val - a.val);
  renderDonut(groups, total);
  $("finLegend").innerHTML = groups.length
    ? groups
        .map(
          (g) =>
            `<div class="lg"><span class="sw" style="background:${CAT_COLOR(g.idx)}"></span>${esc(g.cat)}<span class="amt">${money(g.val)}</span><span class="pct">${total ? Math.round((g.val / total) * 100) : 0}%</span></div>`
        )
        .join("")
    : `<div class="empty">Sin gastos este mes todavía.</div>`;
  // lista combinada de movimientos (gastos + ingresos)
  const movs = [...exp.map((e) => ({ kind: "g", ...e })), ...inc.map((e) => ({ kind: "i", ...e }))].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  $("finList").innerHTML = movs.length
    ? movs
        .map((mv) =>
          mv.kind === "i"
            ? `<div class="item income">
        <span class="cat-dot" style="background:var(--good)"></span>
        <div class="desc"><div class="t">${esc(mv.note) || "Ingreso"}</div><div class="s">Ingreso · ${mv.date.slice(8, 10)}/${mv.date.slice(5, 7)}</div></div>
        <span class="val">+${money(mv.amount)}</span>
        <button class="icon-btn" data-del-inc="${mv.id}" title="Eliminar">✕</button></div>`
            : `<div class="item">
        <span class="cat-dot" style="background:${CAT_COLOR(CATS.indexOf(mv.cat))}"></span>
        <div class="desc"><div class="t">${esc(mv.note) || esc(mv.cat)}</div><div class="s">${esc(mv.cat)} · ${mv.date.slice(8, 10)}/${mv.date.slice(5, 7)}</div></div>
        <span class="val">${money(mv.amount)}</span>
        <button class="icon-btn" data-del-exp="${mv.id}" title="Eliminar">✕</button></div>`
        )
        .join("")
    : `<div class="empty">Agrega tu primer movimiento 👇</div>`;
  renderBalance(m);
}

function renderBalance(m) {
  m = m || selectedMonth();
  const inc = state.incomes.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
  const out = state.expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
  const net = inc - out;
  $("balIn").textContent = moneyShort(inc);
  $("balOut").textContent = moneyShort(out);
  const nb = $("balNet");
  nb.textContent = moneyShort(net);
  nb.className = "bv " + (net >= 0 ? "pos" : "neg");
  const budget = Number(state.config.budget) || 0;
  const wrap = $("budgetWrap");
  if (budget > 0) {
    const pct = (out / budget) * 100;
    const cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
    wrap.innerHTML = `<div class="budget-head"><span>Presupuesto</span><span>${moneyShort(out)} / ${moneyShort(budget)}</span></div>
      <div class="progress ${cls}"><span style="width:${Math.min(pct, 100)}%"></span></div>
      <div class="budget-msg ${pct >= 100 ? "over" : ""}">${pct >= 100 ? `¡Te pasaste por ${moneyShort(out - budget)}! 🔴` : `Te queda ${moneyShort(budget - out)} (${Math.round(100 - pct)}%)`}</div>`;
  } else {
    wrap.innerHTML = `<div class="budget-msg">Fija un presupuesto mensual en ⚙️ Ajustes para ver tu progreso.</div>`;
  }
}

function renderGoals() {
  $("goalList").innerHTML = state.goals.length
    ? state.goals
        .map((g) => {
          const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
          const done = g.saved >= g.target;
          return `<div class="goal">
          <div class="goal-head">
            <span class="goal-name">${done ? "🎉 " : ""}${esc(g.name)}</span>
            <span class="goal-amt">${moneyShort(g.saved)} / ${moneyShort(g.target)}</span>
            <button class="icon-btn" data-del-goal="${g.id}" title="Eliminar">✕</button>
          </div>
          <div class="progress"><span style="width:${pct}%;${done ? "background:var(--good)" : ""}"></span></div>
          <div class="goal-ctrls"><button class="ghost" data-goal-add="${g.id}">＋ Abonar</button></div>
        </div>`;
        })
        .join("")
    : `<div class="empty">Crea una meta para empezar a ahorrar 🎯</div>`;
}
function renderDonut(groups, total) {
  const size = 168,
    r = 65,
    sw = 26,
    cx = size / 2,
    cy = size / 2,
    C = 2 * Math.PI * r;
  const wrap = $("donutWrap");
  if (!groups.length) {
    wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Sin datos">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--hairline)" stroke-width="${sw}"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="var(--muted)" font-size="13">Sin datos</text></svg>`;
    return;
  }
  let off = 0;
  const arcs = groups
    .map((g) => {
      const frac = g.val / total,
        len = frac * C;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CAT_COLOR(g.idx)}" stroke-width="${sw}"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})">
      <title>${esc(g.cat)}: ${money(g.val)} (${Math.round(frac * 100)}%)</title></circle>`;
      off += len + 2;
      return seg;
    })
    .join("");
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Gastos por categoría">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--hairline)" stroke-width="${sw}"/>
    ${arcs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--muted)" font-size="10" letter-spacing="0.5">TOTAL</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700">${moneyShort(total)}</text>
  </svg>`;
}

// ---------- Resumen por mes ----------
function shiftMonth(mo, delta) {
  const [y, m] = mo.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function renderMonthlySummary() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  const totals = months.map((mo) =>
    state.expenses.filter((e) => e.date.startsWith(mo)).reduce((s, e) => s + e.amount, 0)
  );
  const max = Math.max(1, ...totals);
  $("msChart").innerHTML = months
    .map((mo, i) => {
      const h = (totals[i] / max) * 100;
      const lbl = new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)) - 1, 1)
        .toLocaleDateString("es", { month: "short" })
        .replace(".", "");
      const isCur = mo === curMonth();
      return `<div class="ms-col" title="${lbl}: ${money(totals[i])}">
      <div class="ms-val">${totals[i] > 0 ? moneyShort(totals[i]) : ""}</div>
      <div class="ms-bar-track"><div class="ms-bar ${isCur ? "cur" : ""}" style="height:${totals[i] > 0 ? Math.max(h, 2) : 0}%"></div></div>
      <div class="ms-lbl">${lbl}</div></div>`;
    })
    .join("");
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  $("msAvg").textContent = `Promedio: ${money(avg)}`;
}

// ---------- Eventos: finanzas ----------
let txType = "gasto";
document.querySelectorAll("#txType .seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    txType = b.dataset.type;
    document.querySelectorAll("#txType .seg-btn").forEach((x) => x.classList.toggle("active", x === b));
    const isInc = txType === "ingreso";
    $("finCat").style.display = isInc ? "none" : "";
    $("finNote").placeholder = isInc ? "Fuente (opcional)" : "Nota (opcional)";
    $("finSubmit").textContent = isInc ? "Agregar ingreso" : "Agregar gasto";
  })
);
$("finForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat($("finAmount").value);
  if (!(amount > 0)) return;
  const note = $("finNote").value.trim();
  if (txType === "ingreso") state.incomes.push({ id: uid(), amount, note, date: todayStr });
  else state.expenses.push({ id: uid(), amount, cat: $("finCat").value, note, date: todayStr });
  $("finAmount").value = "";
  $("finNote").value = "";
  $("finMonth").value = curMonth();
  save();
  renderFinance();
  renderMonthlySummary();
  renderHome();
  renderCalendar();
});
$("finMonth").addEventListener("change", renderFinance);

// Metas de ahorro
$("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("goalName").value.trim();
  const target = parseFloat($("goalTarget").value);
  if (!name || !(target > 0)) return;
  state.goals.push({ id: uid(), name, target, saved: 0 });
  $("goalName").value = "";
  $("goalTarget").value = "";
  save();
  renderGoals();
});
