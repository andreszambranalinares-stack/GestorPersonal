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
function renderTasks() {
  const list = state.tasks
    .filter((t) => t.date === todayStr || !t.done)
    .sort((a, b) => a.done - b.done || { alta: 0, media: 1, baja: 2 }[a.prio] - { alta: 0, media: 1, baja: 2 }[b.prio]);
  const pending = state.tasks.filter((t) => !t.done).length;
  $("taskCount").textContent = pending ? `${pending} pendiente${pending > 1 ? "s" : ""}` : "todo hecho ✨";
  $("taskList").innerHTML = list.length
    ? list
        .map(
          (t) => `<div class="task ${t.done ? "done" : ""}">
        <input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}>
        <span class="txt">${esc(t.text)}</span>
        ${t.routineId ? `<span class="recur" title="Recurrente">🔁</span>` : ""}
        ${!t.routineId && t.created && t.created < todayStr ? `<span class="carried" title="Arrastrada desde ${t.created.slice(8, 10)}/${t.created.slice(5, 7)}">↪</span>` : ""}
        <span class="pill ${esc(t.prio)}">${esc(t.prio)}</span>
        <button class="icon-btn" data-del-task="${t.id}" title="Eliminar">✕</button>
      </div>`
        )
        .join("")
    : `<div class="empty">Sin tareas. ¡Agrega una! 👆</div>`;
  renderRoutines();
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
$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("taskText").value.trim();
  if (!text) return;
  const prio = $("taskPrio").value,
    repeat = $("taskRepeat").value;
  let routineId;
  if (repeat) {
    routineId = uid();
    state.routines.push({ id: routineId, text, prio, repeat, dow: new Date().getDay() });
  }
  state.tasks.push({ id: uid(), text, prio, done: false, date: todayStr, created: todayStr, routineId });
  $("taskText").value = "";
  $("taskRepeat").value = "";
  save();
  renderTasks();
  renderHome();
});
