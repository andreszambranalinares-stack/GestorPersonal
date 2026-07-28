"use strict";

// ---------- Inicio (resumen) ----------
function renderHome() {
  const mo = curMonth();
  const gastoHoy = state.expenses.filter((e) => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  const gastoMes = state.expenses.filter((e) => e.date.startsWith(mo)).reduce((s, e) => s + e.amount, 0);
  const ingMes = state.incomes.filter((e) => e.date.startsWith(mo)).reduce((s, e) => s + e.amount, 0);
  const net = ingMes - gastoMes;
  const pend = state.tasks.filter((t) => !t.done).length;
  const habDone = state.habits.filter((h) => h.log[todayStr]).length;

  // Resumen del mes (mismos tiles de color que Finanzas).
  $("homeMonthLbl").textContent = new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)) - 1, 1).toLocaleDateString(
    "es",
    { month: "long" }
  );
  $("homeIn").textContent = moneyShort(ingMes);
  $("homeOut").textContent = moneyShort(gastoMes);
  const nb = $("homeNet");
  nb.textContent = moneyShort(net);
  nb.className = "bv " + (net >= 0 ? "pos" : "neg");

  $("stGastoHoy").textContent = moneyShort(gastoHoy);
  $("stPend").textContent = pend;
  $("stHab").textContent = `${habDone}/${state.habits.length}`;

  const tt = state.tasks
    .filter((t) => t.date === todayStr)
    .sort((a, b) => a.done - b.done || { alta: 0, media: 1, baja: 2 }[a.prio] - { alta: 0, media: 1, baja: 2 }[b.prio]);
  $("homeTaskCount").textContent = pend ? `${pend} pendiente${pend > 1 ? "s" : ""}` : "todo hecho ✨";
  $("homeTasks").innerHTML = tt.length
    ? tt
        .map(
          (t) => `<div class="task ${t.done ? "done" : ""}">
        <input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}>
        <span class="txt">${esc(t.text)}</span>
        ${t.routineId ? `<span class="recur">🔁</span>` : ""}
        <span class="pill ${esc(t.prio)}">${esc(t.prio)}</span>
      </div>`
        )
        .join("")
    : `<div class="empty">Sin tareas para hoy. Añádelas en la pestaña ✅</div>`;

  $("homeHabits").innerHTML = state.habits.length
    ? state.habits
        .map((h) => {
          const on = !!h.log[todayStr],
            st = streakOf(h);
          return `<button class="chip ${on ? "on" : ""}" data-habit="${h.id}" data-day="${todayStr}">${on ? "✓" : "○"} ${esc(h.name)} ${st > 0 ? `<span class="st">🔥${st}</span>` : ""}</button>`;
        })
        .join("")
    : `<div class="empty">Crea hábitos en la pestaña 🔥</div>`;
}
