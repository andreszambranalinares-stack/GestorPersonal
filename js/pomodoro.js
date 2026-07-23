"use strict";

// ---------- Pomodoro ----------
const POMO = { work: 25 * 60, brk: 5 * 60 };
let pomoMode = "work",
  pomoLeft = POMO.work,
  pomoTimer = null;
function pomoRender() {
  $("pomoTime").textContent = `${pad(Math.floor(pomoLeft / 60))}:${pad(pomoLeft % 60)}`;
  $("pomoMode").textContent = pomoMode === "work" ? "Enfoque" : "Descanso";
  $("pomo").classList.toggle("break", pomoMode === "brk");
  $("pomoStart").textContent = pomoTimer ? "Pausar" : "Iniciar";
}
function pomoTick() {
  pomoLeft--;
  if (pomoLeft <= 0) {
    clearInterval(pomoTimer);
    pomoTimer = null;
    pomoBeep();
    notify(pomoMode === "work" ? "¡Tiempo de descanso! 🍵" : "¡A enfocarse de nuevo! 🍅");
    const el = $("pomo");
    el.classList.add("ring");
    setTimeout(() => el.classList.remove("ring"), 2600);
    pomoMode = pomoMode === "work" ? "brk" : "work";
    pomoLeft = pomoMode === "work" ? POMO.work : POMO.brk;
  }
  pomoRender();
}
function pomoToggle() {
  if (pomoTimer) {
    clearInterval(pomoTimer);
    pomoTimer = null;
  } else {
    ensureNotifyPermission();
    pomoTimer = setInterval(pomoTick, 1000);
  }
  pomoRender();
}
function pomoReset() {
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoLeft = pomoMode === "work" ? POMO.work : POMO.brk;
  pomoRender();
}
function pomoSkip() {
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoMode = pomoMode === "work" ? "brk" : "work";
  pomoLeft = pomoMode === "work" ? POMO.work : POMO.brk;
  pomoRender();
}
function pomoBeep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
    o.start();
    o.stop(ac.currentTime + 0.7);
  } catch {
    /* sin audio disponible, no molestamos al usuario por esto */
  }
}
function ensureNotifyPermission() {
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
}
function notify(msg) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Panel Personal", { body: msg });
    } catch {
      /* sin notificación disponible */
    }
  }
}
$("pomoStart").addEventListener("click", pomoToggle);
$("pomoReset").addEventListener("click", pomoReset);
$("pomoSkip").addEventListener("click", pomoSkip);
