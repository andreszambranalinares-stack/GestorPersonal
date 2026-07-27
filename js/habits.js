"use strict";

// ---------- Hábitos ----------
function last7() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}
function streakOf(h) {
  let s = 0;
  const d = new Date();
  if (!h.log[ymd(d)]) d.setDate(d.getDate() - 1);
  while (h.log[ymd(d)]) {
    s++;
    d.setDate(d.getDate() - 1);
  }
  return s;
}
function renderHabits() {
  const dl = ["D", "L", "M", "X", "J", "V", "S"];
  const days = last7();
  $("habitList").innerHTML = state.habits.length
    ? state.habits
        .map((h) => {
          const st = streakOf(h);
          const cells = days
            .map((d) => {
              const key = ymd(d),
                on = !!h.log[key],
                isToday = key === todayStr;
              return `<div class="day ${isToday ? "today" : ""}"><div class="dl">${dl[d.getDay()]}</div>
            <div class="cell ${on ? "on" : ""}" data-habit="${h.id}" data-day="${key}">${on ? "✓" : ""}</div></div>`;
            })
            .join("");
          return `<div class="habit"><div class="habit-head">
            <span class="habit-name">${esc(h.name)}</span>
            <span class="streak">🔥 ${st} día${st !== 1 ? "s" : ""}</span>
            <button class="icon-btn" data-rename-habit="${h.id}" title="Renombrar" aria-label="Renombrar hábito">✏️</button>
            <button class="icon-btn" data-del-habit="${h.id}" title="Eliminar" aria-label="Eliminar hábito">✕</button>
          </div><div class="week">${cells}</div></div>`;
        })
        .join("")
    : `<div class="empty">Crea tu primer hábito para empezar tu racha 🔥</div>`;
}

// ---------- Eventos: hábitos ----------
$("habitForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("habitName").value.trim();
  if (!name) return;
  state.habits.push({ id: uid(), name, log: {} });
  $("habitName").value = "";
  save();
  renderHabits();
  renderHome();
});
