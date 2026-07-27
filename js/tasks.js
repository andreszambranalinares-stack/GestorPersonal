"use strict";

// ---------- Tareas ----------
function rolloverTasks() {
  let changed = false;
  state.tasks.forEach((t) => {
    if (!t.created) t.created = t.date;
    if (!t.done && t.date < todayStr) {
      t.date = todayStr;
      changed = true;
    }
  });
  const dow = new Date().getDay();
  state.routines.forEach((rt) => {
    let due = false;
    if (rt.repeat === "diario") due = true;
    else if (rt.repeat === "laborables") due = dow >= 1 && dow <= 5;
    else if (rt.repeat === "semanal") due = dow === rt.dow;
    if (!due) return;
    if (!state.tasks.some((t) => t.routineId === rt.id && t.date === todayStr)) {
      state.tasks.push({
        id: uid(),
        text: rt.text,
        prio: rt.prio,
        done: false,
        date: todayStr,
        created: todayStr,
        routineId: rt.id,
      });
      changed = true;
    }
  });
  if (changed) save();
}
const PRIO_ORDER = { alta: 0, media: 1, baja: 2 };
function taskRowHtml(t, showDate) {
  const dateBadge = showDate
    ? `<span class="carried" title="Agendada">📅 ${t.date.slice(8, 10)}/${t.date.slice(5, 7)}</span>`
    : "";
  return `<div class="task ${t.done ? "done" : ""}">
        <input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}>
        <span class="txt">${esc(t.text)}</span>
        ${t.routineId ? `<span class="recur" title="Recurrente">🔁</span>` : ""}
        ${!t.routineId && !showDate && t.created && t.created < todayStr ? `<span class="carried" title="Arrastrada desde ${t.created.slice(8, 10)}/${t.created.slice(5, 7)}">↪</span>` : ""}
        ${dateBadge}
        <span class="pill ${esc(t.prio)}">${esc(t.prio)}</span>
        <button class="icon-btn" data-edit-task="${t.id}" title="Editar">✏️</button>
        <button class="icon-btn" data-del-task="${t.id}" title="Eliminar">✕</button>
      </div>`;
}
function renderTasks() {
  const today = state.tasks
    .filter((t) => t.date === todayStr)
    .sort((a, b) => a.done - b.done || PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio]);
  const upcoming = state.tasks
    .filter((t) => t.date > todayStr && !t.done)
    .sort((a, b) => a.date.localeCompare(b.date) || PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio]);
  const pending = state.tasks.filter((t) => !t.done).length;
  $("taskCount").textContent = pending ? `${pending} pendiente${pending > 1 ? "s" : ""}` : "todo hecho ✨";
  $("taskList").innerHTML = today.length
    ? today.map((t) => taskRowHtml(t, false)).join("")
    : `<div class="empty">Sin tareas para hoy. ¡Agrega una! 👆</div>`;
  $("taskUpcoming").innerHTML = upcoming.length
    ? `<div class="section-title">📅 Próximas</div>` + upcoming.map((t) => taskRowHtml(t, true)).join("")
    : "";
  renderRoutines();
}
// Aviso (al abrir la app) de tareas y hábitos pendientes de hoy.
// Nota: sin backend no hay push en segundo plano; el aviso se da al abrir la app.
function checkTaskReminders() {
  const dueTasks = state.tasks.filter((t) => t.date === todayStr && !t.done).length;
  const pendingHabits = state.habits.filter((h) => !h.log[todayStr]).length;
  const parts = [];
  if (dueTasks) parts.push(`${dueTasks} tarea${dueTasks > 1 ? "s" : ""} pendiente${dueTasks > 1 ? "s" : ""}`);
  if (pendingHabits) parts.push(`${pendingHabits} hábito${pendingHabits > 1 ? "s" : ""} por marcar`);
  if (!parts.length) return;
  const msg = `Hoy tienes ${parts.join(" y ")}.`;
  toast(msg, { type: "info", duration: 6000 });
  if (state.config.notifications) notify(msg);
}
const REPEAT_LBL = { diario: "Diario", laborables: "Laborables", semanal: "Semanal" };
const REPEATS = Object.keys(REPEAT_LBL);
function renderRoutines() {
  const box = $("routinesBox");
  if (!state.routines.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML =
    `<div class="section-title">🔁 Rutinas activas</div>` +
    state.routines
      .map(
        (rt) =>
          `<div class="rt"><span style="flex:1 1 auto;">${esc(rt.text)}</span>
      <span class="rt-rep">${REPEAT_LBL[rt.repeat] || esc(rt.repeat)}</span>
      <button class="icon-btn" data-del-routine="${rt.id}" title="Dejar de repetir">✕</button></div>`
      )
      .join("");
}

// ---------- Eventos: tareas ----------
let editingTask = null; // id de la tarea en edición
function startEditTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  editingTask = id;
  $("taskText").value = t.text;
  $("taskPrio").value = t.prio;
  $("taskDate").value = t.date; // permite reprogramar la tarea
  $("taskRepeat").value = "";
  $("taskRepeat").style.display = "none"; // la repetición no aplica al editar una tarea existente
  $("taskSubmit").textContent = "Guardar";
  $("taskCancel").style.display = "";
  $("taskText").focus();
}
function cancelEditTask() {
  editingTask = null;
  $("taskText").value = "";
  $("taskDate").value = todayStr;
  $("taskRepeat").style.display = "";
  $("taskSubmit").textContent = "Añadir";
  $("taskCancel").style.display = "none";
}
$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("taskText").value.trim();
  if (!text) return;
  const prio = $("taskPrio").value;
  const date = /^\d{4}-\d{2}-\d{2}$/.test($("taskDate").value) ? $("taskDate").value : todayStr;
  if (editingTask) {
    const t = state.tasks.find((x) => x.id === editingTask);
    if (t) {
      t.text = text;
      t.prio = prio;
      t.date = date;
    }
    cancelEditTask();
  } else {
    const repeat = $("taskRepeat").value;
    let routineId;
    if (repeat) {
      routineId = uid();
      state.routines.push({ id: routineId, text, prio, repeat, dow: new Date().getDay() });
    }
    const nid = uid();
    state.tasks.push({ id: nid, text, prio, done: false, date, created: todayStr, routineId });
    $("taskText").value = "";
    $("taskRepeat").value = "";
    $("taskDate").value = todayStr;
    save();
    renderTasks();
    renderHome();
    flashNew(nid);
    return;
  }
  save();
  renderTasks();
  renderHome();
});
$("taskCancel").addEventListener("click", cancelEditTask);
