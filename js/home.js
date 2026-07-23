"use strict";

// ---------- Inicio (resumen) ----------
function renderHome() {
  const gastoHoy = state.expenses.filter((e) => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  const gastoMes = state.expenses.filter((e) => e.date.startsWith(curMonth())).reduce((s, e) => s + e.amount, 0);
  const pend = state.tasks.filter((t) => !t.done).length;
  const habDone = state.habits.filter((h) => h.log[todayStr]).length;
  $("stGastoHoy").textContent = moneyShort(gastoHoy);
  $("stGastoMes").textContent = moneyShort(gastoMes);
  $("stPend").textContent = pend;
  $("stHab").textContent = `${habDone}/${state.habits.length}`;

  const tt = state.tasks
    .filter((t) => t.date === todayStr || !t.done)
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
