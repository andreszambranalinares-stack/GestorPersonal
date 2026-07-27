"use strict";

// ---------- Informe mensual imprimible / PDF ----------
// Construye un informe limpio del mes seleccionado y abre el diálogo de impresión
// (desde ahí el usuario puede "Guardar como PDF"). Sin dependencias.

function monthLabel(month) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  return new Date(y, m, 1).toLocaleDateString("es", { month: "long", year: "numeric" });
}

function buildMonthlyReport(month) {
  const inMonth = (d) => typeof d === "string" && d.startsWith(month);
  const expenses = state.expenses.filter((e) => inMonth(e.date));
  const incomes = state.incomes.filter((e) => inMonth(e.date));
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIn = incomes.reduce((s, e) => s + e.amount, 0);
  const net = totalIn - totalOut;

  // Gastos por categoría (desc).
  const byCat = {};
  expenses.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + e.amount));
  const cats = Object.keys(byCat)
    .map((c) => ({ c, v: byCat[c], pct: totalOut > 0 ? Math.round((byCat[c] / totalOut) * 100) : 0 }))
    .sort((a, b) => b.v - a.v);

  // Mayores gastos del mes.
  const top = expenses
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Tareas completadas y hábitos del mes.
  const tasksDone = state.tasks.filter((t) => t.done && inMonth(t.date)).length;
  const habits = state.habits
    .map((h) => ({ name: h.name, days: Object.keys(h.log || {}).filter(inMonth).length }))
    .filter((h) => h.days > 0)
    .sort((a, b) => b.days - a.days);

  const row = (a, b, cls = "") => `<tr class="${cls}"><td>${a}</td><td class="num">${b}</td></tr>`;
  const rows = (arr) => (arr.length ? arr.join("") : `<tr><td class="muted" colspan="2">Sin datos este mes.</td></tr>`);

  const html = `
    <div class="report-page">
      <header class="report-head">
        <div class="report-brand"><span class="report-logo">📊</span> Panel Personal</div>
        <div class="report-sub">Informe de <b>${esc(monthLabel(month))}</b></div>
        <div class="report-gen">Generado el ${new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}</div>
      </header>

      <section class="report-kpis">
        <div class="report-kpi"><div class="k-l">Ingresos</div><div class="k-v pos">${money(totalIn)}</div></div>
        <div class="report-kpi"><div class="k-l">Gastos</div><div class="k-v neg">${money(totalOut)}</div></div>
        <div class="report-kpi"><div class="k-l">Saldo</div><div class="k-v ${net >= 0 ? "pos" : "neg"}">${money(net)}</div></div>
      </section>

      <h3 class="report-h">Gastos por categoría</h3>
      <table class="report-table">
        <tbody>${rows(cats.map((x) => row(`${esc(x.c)} <span class="muted">· ${x.pct}%</span>`, money(x.v))))}</tbody>
      </table>

      <h3 class="report-h">Mayores gastos</h3>
      <table class="report-table">
        <tbody>${rows(
          top.map((e) =>
            row(
              `<span class="muted">${esc(e.date)}</span> · ${esc(e.cat)}${e.note ? " · " + esc(e.note) : ""}`,
              money(e.amount)
            )
          )
        )}</tbody>
      </table>

      <h3 class="report-h">Productividad</h3>
      <table class="report-table">
        <tbody>
          ${row("Tareas completadas", tasksDone)}
          ${habits.map((h) => row(`Hábito: ${esc(h.name)}`, `${h.days} día${h.days > 1 ? "s" : ""}`)).join("")}
        </tbody>
      </table>

      <footer class="report-foot">Panel Personal · datos privados de tu dispositivo</footer>
    </div>`;

  const root = $("reportRoot");
  root.innerHTML = html;
  return { totalIn, totalOut, net, cats, top, tasksDone, habits };
}

function printMonthlyReport() {
  const month = $("finMonth").value || curMonth();
  buildMonthlyReport(month);
  window.print();
}

if ($("btnReport")) $("btnReport").addEventListener("click", printMonthlyReport);
