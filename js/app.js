"use strict";

// ---------- Render maestro ----------
function renderAll() {
  renderHome();
  renderFinance();
  renderMonthlySummary();
  renderGoals();
  renderCalendar();
  renderTasks();
  renderHabits();
}

// ---------- Delegación de clicks ----------
document.body.addEventListener("click", (e) => {
  const b = e.target.closest(
    "[data-del-exp],[data-del-inc],[data-del-task],[data-del-habit],[data-del-routine],[data-del-goal],[data-goal-add],[data-habit]"
  );
  if (!b) return;
  if (b.dataset.delExp) {
    state.expenses = state.expenses.filter((x) => x.id !== b.dataset.delExp);
    save();
    renderFinance();
    renderMonthlySummary();
    renderHome();
    renderCalendar();
  } else if (b.dataset.delInc) {
    state.incomes = state.incomes.filter((x) => x.id !== b.dataset.delInc);
    save();
    renderFinance();
    renderHome();
  } else if (b.dataset.delGoal) {
    state.goals = state.goals.filter((x) => x.id !== b.dataset.delGoal);
    save();
    renderGoals();
  } else if (b.dataset.goalAdd) {
    const g = state.goals.find((x) => x.id === b.dataset.goalAdd);
    if (!g) return;
    const v = prompt(`¿Cuánto quieres abonar a "${g.name}"?`);
    if (v == null) return;
    const amt = parseFloat(String(v).replace(",", "."));
    if (amt > 0) {
      g.saved = Math.round((g.saved + amt) * 100) / 100;
      save();
      renderGoals();
    }
  } else if (b.dataset.delTask) {
    state.tasks = state.tasks.filter((x) => x.id !== b.dataset.delTask);
    save();
    renderTasks();
    renderHome();
  } else if (b.dataset.delRoutine) {
    state.routines = state.routines.filter((x) => x.id !== b.dataset.delRoutine);
    save();
    renderRoutines();
  } else if (b.dataset.habit) {
    const h = state.habits.find((x) => x.id === b.dataset.habit);
    if (!h) return;
    const day = b.dataset.day;
    if (h.log[day]) delete h.log[day];
    else h.log[day] = true;
    save();
    renderHabits();
    renderHome();
    renderCalendar();
  }
});
// Checkbox de tareas (funciona en Inicio y en Tareas)
document.body.addEventListener("change", (e) => {
  if (e.target.matches("[data-task]")) {
    const t = state.tasks.find((x) => x.id === e.target.dataset.task);
    if (t) {
      t.done = e.target.checked;
      save();
      renderTasks();
      renderHome();
    }
  }
});

// ---------- PWA ----------
if (location.protocol.startsWith("http")) {
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement("link");
    l.rel = "manifest";
    l.href = "manifest.webmanifest";
    document.head.appendChild(l);
  }
  if ("serviceWorker" in navigator)
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// ---------- Init ----------
function initValues() {
  $("finMonth").value = curMonth();
  renderConfig();
  renderFocus();
}
function init() {
  renderChrome();
  renderCatSelect();
  rolloverTasks();
  initValues();
  renderAll();
  pomoRender();
  switchView("home");
  loadWeather();
  if (stateLoadError) {
    toast("No se pudieron leer tus datos guardados (archivo dañado). Se inició un panel nuevo.", {
      type: "err",
      duration: 8000,
    });
  } else {
    checkBackupReminder();
  }
}
init();
