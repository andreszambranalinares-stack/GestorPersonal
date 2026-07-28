"use strict";

// ---------- Finanzas ----------
// Rellena todos los <select> de categorías desde state.categories.
function renderCatSelects() {
  const opts = state.categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  const finCat = $("finCat");
  if (finCat) finCat.innerHTML = opts;
  const fixedCat = $("fixedCat");
  if (fixedCat) fixedCat.innerHTML = opts;
  const filterCat = $("finFilterCat");
  if (filterCat) {
    const prev = filterCat.value;
    filterCat.innerHTML = `<option value="">Todas las categorías</option>` + opts;
    filterCat.value = state.categories.includes(prev) ? prev : "";
  }
}
function selectedMonth() {
  return $("finMonth").value || curMonth();
}
// Estado del buscador/filtros (solo afecta a la lista de movimientos).
let finSearch = "";
let finFilterCat = "";
let finFilterType = "";
function renderFinance() {
  const m = selectedMonth();
  const exp = state.expenses.filter((e) => e.date.startsWith(m));
  const inc = state.incomes.filter((e) => e.date.startsWith(m));
  const total = exp.reduce((s, e) => s + e.amount, 0);
  $("finTotal").textContent = money(total);
  // Agregación por NOMBRE de categoría: nombres idénticos se suman de forma natural.
  const byCat = {};
  exp.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + e.amount));
  const groups = Object.keys(byCat)
    .map((name) => ({ cat: name, color: catColor(name), val: byCat[name] }))
    .filter((g) => g.val > 0)
    .sort((a, b) => b.val - a.val);
  renderDonut(groups, total);
  $("finLegend").innerHTML = groups.length
    ? groups
        .map(
          (g) =>
            `<div class="lg"><span class="sw" style="background:${g.color}"></span>${esc(g.cat)}<span class="amt">${money(g.val)}</span><span class="pct">${total ? Math.round((g.val / total) * 100) : 0}%</span></div>`
        )
        .join("")
    : `<div class="empty">Sin gastos este mes todavía.</div>`;
  // lista combinada de movimientos (gastos + ingresos)
  const allMovs = [...exp.map((e) => ({ kind: "g", ...e })), ...inc.map((e) => ({ kind: "i", ...e }))].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const q = finSearch.trim().toLowerCase();
  const movs = allMovs.filter((mv) => {
    if (finFilterType && mv.kind !== finFilterType) return false;
    if (finFilterCat && (mv.kind !== "g" || mv.cat !== finFilterCat)) return false;
    if (q) {
      const hay = `${mv.note || ""} ${mv.kind === "g" ? mv.cat : "ingreso"}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const filtering = q || finFilterCat || finFilterType;
  $("finFilterCount").textContent = filtering ? `${movs.length} de ${allMovs.length}` : "";
  $("finList").innerHTML = movs.length
    ? movs
        .map((mv) =>
          mv.kind === "i"
            ? `<div class="item income">
        <span class="cat-dot" style="background:var(--good)"></span>
        <div class="desc"><div class="t">${esc(mv.note) || "Ingreso"}</div><div class="s">Ingreso · ${mv.date.slice(8, 10)}/${mv.date.slice(5, 7)}</div></div>
        <span class="val">+${money(mv.amount)}</span>
        <button class="icon-btn" data-edit-inc="${mv.id}" title="Editar">✏️</button>
        <button class="icon-btn" data-del-inc="${mv.id}" title="Eliminar">✕</button></div>`
            : `<div class="item">
        <span class="cat-dot" style="background:${catColor(mv.cat)}"></span>
        <div class="desc"><div class="t">${esc(mv.note) || esc(mv.cat)}</div><div class="s">${esc(mv.cat)} · ${mv.date.slice(8, 10)}/${mv.date.slice(5, 7)}</div></div>
        <span class="val">${money(mv.amount)}</span>
        <button class="icon-btn" data-edit-exp="${mv.id}" title="Editar">✏️</button>
        <button class="icon-btn" data-del-exp="${mv.id}" title="Eliminar">✕</button></div>`
        )
        .join("")
    : `<div class="empty">${filtering ? "Ningún movimiento coincide con el filtro." : "Agrega tu primer movimiento 👇"}</div>`;
  renderBalance(m);
  renderCategoryBudgets(m);
  renderHealth(m);
}

// Presupuesto por categoría: una barra por cada categoría con límite fijado (mes seleccionado).
function renderCategoryBudgets(m) {
  const box = $("catBudgets");
  if (!box) return;
  m = m || selectedMonth();
  const budgets = state.config.categoryBudgets || {};
  const names = Object.keys(budgets).filter((n) => budgets[n] > 0);
  if (!names.length) {
    box.innerHTML = `<div class="empty">Fija un límite por categoría en ⚙️ Ajustes → Categorías.</div>`;
    return;
  }
  const spentBy = {};
  state.expenses
    .filter((e) => e.date.startsWith(m))
    .forEach((e) => (spentBy[e.cat] = (spentBy[e.cat] || 0) + e.amount));
  box.innerHTML = names
    .sort()
    .map((name) => {
      const budget = budgets[name];
      const spent = spentBy[name] || 0;
      const pct = (spent / budget) * 100;
      const cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
      return `<div style="margin-bottom:12px;">
        <div class="budget-head"><span><span class="cat-dot" style="background:${catColor(name)};display:inline-block;vertical-align:middle;margin-right:6px;"></span>${esc(name)}</span><span>${moneyShort(spent)} / ${moneyShort(budget)}</span></div>
        <div class="progress ${cls}"><span style="width:${Math.min(pct, 100)}%"></span></div>
      </div>`;
    })
    .join("");
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

// Meses (redondeados hacia arriba, mínimo 1) entre hoy y una fecha "YYYY-MM-DD" futura.
function monthsUntil(dateStr) {
  const days = Math.max(1, Math.round((new Date(dateStr) - new Date(todayStr)) / 86400000));
  return Math.max(1, Math.ceil(days / 30.44));
}
function renderGoals() {
  $("goalList").innerHTML = state.goals.length
    ? state.goals
        .map((g) => {
          const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
          const done = g.saved >= g.target;
          let deadlineMsg = "";
          if (g.deadline) {
            const dl = `${g.deadline.slice(8, 10)}/${g.deadline.slice(5, 7)}/${g.deadline.slice(0, 4)}`;
            if (done) {
              deadlineMsg = `<div class="mini">🎯 Meta cumplida (fecha objetivo ${dl}).</div>`;
            } else if (g.deadline < todayStr) {
              deadlineMsg = `<div class="mini" style="color:var(--danger);">⏰ Fecha objetivo ${dl} vencida. Faltan ${moneyShort(g.target - g.saved)}.</div>`;
            } else {
              const perMonth = (g.target - g.saved) / monthsUntil(g.deadline);
              deadlineMsg = `<div class="mini">📅 Para llegar el ${dl}: ahorra ~${moneyShort(perMonth)}/mes.</div>`;
            }
          }
          return `<div class="goal">
          <div class="goal-head">
            <span class="goal-name">${done ? "🎉 " : ""}${esc(g.name)}</span>
            <span class="goal-amt">${moneyShort(g.saved)} / ${moneyShort(g.target)}</span>
            <button class="icon-btn" data-del-goal="${g.id}" title="Eliminar">✕</button>
          </div>
          <div class="progress"><span style="width:${pct}%;${done ? "background:var(--good)" : ""}"></span></div>
          ${deadlineMsg}
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
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${g.color}" stroke-width="${sw}"
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
  renderInsights(totals, months);
}

// Frase comparativa: gasto de este mes vs. el anterior.
function renderInsights(totals, months) {
  const box = $("finInsight");
  if (!box) return;
  const cur = totals[totals.length - 1];
  const prev = totals[totals.length - 2];
  const prevLbl = new Date(
    Number(months[months.length - 2].slice(0, 4)),
    Number(months[months.length - 2].slice(5, 7)) - 1,
    1
  )
    .toLocaleDateString("es", { month: "long" })
    .replace(".", "");
  if (prev <= 0 && cur <= 0) {
    box.textContent = "";
    return;
  }
  if (prev <= 0) {
    box.innerHTML = `📊 Este mes llevas <b>${moneyShort(cur)}</b> en gastos (no hay datos del mes anterior para comparar).`;
    return;
  }
  const diff = cur - prev;
  const pct = Math.round((Math.abs(diff) / prev) * 100);
  if (diff === 0) {
    box.innerHTML = `📊 Llevas lo mismo que en ${prevLbl} (${moneyShort(cur)}).`;
  } else if (diff > 0) {
    box.innerHTML = `📈 Llevas <b>${pct}% más</b> que en ${prevLbl} (${moneyShort(cur)} vs ${moneyShort(prev)}).`;
  } else {
    box.innerHTML = `📉 Llevas <b>${pct}% menos</b> que en ${prevLbl} (${moneyShort(cur)} vs ${moneyShort(prev)}). ¡Bien! 🎉`;
  }
}

// ---------- Eventos: finanzas ----------
let txType = "gasto";
let editingTx = null; // {kind, id} cuando se está editando un movimiento
let justAddedId = null; // id de la última fila creada, para el resalte transitorio
function setTxType(type) {
  txType = type;
  document.querySelectorAll("#txType .seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.type === type));
  const isInc = type === "ingreso";
  $("finCat").style.display = isInc ? "none" : "";
  $("finNote").placeholder = isInc ? "Fuente (opcional)" : "Nota (opcional)";
  if (!editingTx) $("finSubmit").textContent = isInc ? "Agregar ingreso" : "Agregar gasto";
}
document.querySelectorAll("#txType .seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    if (editingTx) return; // el tipo queda bloqueado mientras se edita
    setTxType(b.dataset.type);
  })
);
function startEditTx(kind, id) {
  const rec = kind === "i" ? state.incomes.find((x) => x.id === id) : state.expenses.find((x) => x.id === id);
  if (!rec) return;
  editingTx = { kind, id };
  setTxType(kind === "i" ? "ingreso" : "gasto");
  $("finAmount").value = rec.amount;
  $("finNote").value = rec.note || "";
  if (kind === "g") $("finCat").value = rec.cat;
  $("finSubmit").textContent = "Guardar cambios";
  $("txType").style.display = "none"; // no se puede cambiar gasto↔ingreso al editar
  $("finCancel").style.display = "";
  $("finAmount").focus();
}
function cancelEditTx() {
  editingTx = null;
  $("finAmount").value = "";
  $("finNote").value = "";
  $("txType").style.display = "";
  $("finCancel").style.display = "none";
  setTxType(txType);
}
$("finForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat($("finAmount").value);
  if (!(amount > 0)) return;
  const note = $("finNote").value.trim();
  if (editingTx) {
    const rec =
      editingTx.kind === "i"
        ? state.incomes.find((x) => x.id === editingTx.id)
        : state.expenses.find((x) => x.id === editingTx.id);
    if (rec) {
      rec.amount = amount;
      rec.note = note;
      if (editingTx.kind === "g") rec.cat = $("finCat").value;
    }
    cancelEditTx();
  } else {
    const nid = uid();
    if (txType === "ingreso") state.incomes.push({ id: nid, amount, note, date: todayStr });
    else state.expenses.push({ id: nid, amount, cat: $("finCat").value, note, date: todayStr });
    $("finAmount").value = "";
    $("finNote").value = "";
    $("finMonth").value = curMonth();
    justAddedId = nid;
  }
  save();
  renderFinance();
  renderMonthlySummary();
  renderHome();
  renderCalendar();
  if (justAddedId) {
    flashNew(justAddedId);
    justAddedId = null;
  }
});
$("finCancel").addEventListener("click", cancelEditTx);
$("finMonth").addEventListener("change", renderFinance);

// Buscar / filtrar movimientos (solo recorta la lista, no el donut ni el balance)
$("finSearch").addEventListener("input", (e) => {
  finSearch = e.target.value;
  renderFinance();
});
$("finFilterCat").addEventListener("change", (e) => {
  finFilterCat = e.target.value;
  renderFinance();
});
$("finFilterType").addEventListener("change", (e) => {
  finFilterType = e.target.value;
  renderFinance();
});

// ---------- Gastos fijos recurrentes ----------
function rolloverFixedExpenses() {
  let changed = false;
  const today = new Date().getDate();
  const m = curMonth();
  state.fixedExpenses.forEach((fe) => {
    if (today < fe.day) return; // aún no toca este mes
    const already = state.expenses.some((e) => e.fixedId === fe.id && e.date.startsWith(m));
    if (already) return;
    state.expenses.push({
      id: uid(),
      amount: fe.amount,
      cat: fe.cat,
      note: fe.note,
      date: `${m}-${pad(fe.day)}`,
      fixedId: fe.id,
    });
    changed = true;
  });
  if (changed) save();
}
function renderFixedExpenses() {
  const box = $("fixedList");
  if (!box) return;
  box.innerHTML = state.fixedExpenses.length
    ? state.fixedExpenses
        .map(
          (fe) =>
            `<div class="rt"><span class="cat-dot" style="background:${catColor(fe.cat)}"></span>
        <span style="flex:1 1 auto;">${esc(fe.note) || esc(fe.cat)}<span class="s" style="color:var(--muted);"> · ${esc(fe.cat)}</span></span>
        <span class="rt-rep">día ${fe.day} · ${money(fe.amount)}</span>
        <button class="icon-btn" data-del-fixed="${fe.id}" title="Eliminar gasto fijo">✕</button></div>`
        )
        .join("")
    : `<div class="empty">Sin gastos fijos. Añade alquiler, suscripciones, etc. 👇</div>`;
}
$("fixedForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat($("fixedAmount").value);
  let day = parseInt($("fixedDay").value, 10);
  if (!(amount > 0)) return;
  if (!(day >= 1 && day <= 28)) day = 1;
  state.fixedExpenses.push({
    id: uid(),
    amount,
    cat: $("fixedCat").value,
    note: $("fixedNote").value.trim(),
    day,
  });
  $("fixedAmount").value = "";
  $("fixedNote").value = "";
  $("fixedDay").value = "";
  save();
  rolloverFixedExpenses(); // registra ya el del mes en curso si corresponde
  renderFixedExpenses();
  renderFinance();
  renderMonthlySummary();
  renderHome();
  renderCalendar();
});

// ---------- Ingresos recurrentes (espejo de los gastos fijos) ----------
function rolloverFixedIncomes() {
  let changed = false;
  const today = new Date().getDate();
  const m = curMonth();
  state.fixedIncomes.forEach((fi) => {
    if (today < fi.day) return;
    const already = state.incomes.some((e) => e.fixedId === fi.id && e.date.startsWith(m));
    if (already) return;
    state.incomes.push({ id: uid(), amount: fi.amount, note: fi.note, date: `${m}-${pad(fi.day)}`, fixedId: fi.id });
    changed = true;
  });
  if (changed) save();
}
function renderFixedIncomes() {
  const box = $("fincomeList");
  if (!box) return;
  box.innerHTML = state.fixedIncomes.length
    ? state.fixedIncomes
        .map(
          (fi) =>
            `<div class="rt"><span class="cat-dot" style="background:var(--good)"></span>
        <span style="flex:1 1 auto;">${esc(fi.note) || "Ingreso"}</span>
        <span class="rt-rep">día ${fi.day} · +${money(fi.amount)}</span>
        <button class="icon-btn" data-del-fincome="${fi.id}" title="Eliminar ingreso fijo">✕</button></div>`
        )
        .join("")
    : `<div class="empty">Sin ingresos fijos. Añade tu nómina u otros ingresos periódicos 👇</div>`;
}
$("fincomeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat($("fincomeAmount").value);
  let day = parseInt($("fincomeDay").value, 10);
  if (!(amount > 0)) return;
  if (!(day >= 1 && day <= 28)) day = 1;
  state.fixedIncomes.push({ id: uid(), amount, note: $("fincomeNote").value.trim(), day });
  $("fincomeAmount").value = "";
  $("fincomeNote").value = "";
  $("fincomeDay").value = "";
  save();
  rolloverFixedIncomes();
  renderFixedIncomes();
  renderFinance();
  renderHome();
  renderCalendar();
});

// Metas de ahorro
$("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("goalName").value.trim();
  const target = parseFloat($("goalTarget").value);
  if (!name || !(target > 0)) return;
  const deadline = $("goalDeadline").value || undefined;
  state.goals.push({ id: uid(), name, target, saved: 0, deadline });
  $("goalName").value = "";
  $("goalTarget").value = "";
  $("goalDeadline").value = "";
  save();
  renderGoals();
});
