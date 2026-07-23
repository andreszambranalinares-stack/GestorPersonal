"use strict";

// ---------- Navegación ----------
const VIEWS = ["home", "finanzas", "tareas", "habitos", "calendario", "ajustes"];
const VIEW_TITLE = {
  home: "Inicio",
  finanzas: "Finanzas",
  tareas: "Tareas",
  habitos: "Hábitos",
  calendario: "Calendario",
  ajustes: "Ajustes",
};
let currentView = "home";
function switchView(v) {
  if (!VIEWS.includes(v)) v = "home";
  currentView = v;
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
  document.querySelectorAll("[data-nav]").forEach((el) => el.classList.toggle("active", el.dataset.nav === v));
  $("barTitle").textContent = VIEW_TITLE[v];
  $("fab").style.display = ["finanzas", "tareas", "habitos"].includes(v) ? "flex" : "none";
  window.scrollTo(0, 0);
  closeDrawer();
  if (v === "home") renderHome();
  if (v === "calendario") renderCalendar();
  if (v === "finanzas") {
    renderFinance();
    renderMonthlySummary();
  }
}
function openDrawer() {
  $("drawer").classList.add("open");
  $("scrim").classList.add("show");
}
function closeDrawer() {
  $("drawer").classList.remove("open");
  $("scrim").classList.remove("show");
}

$("hamburger").addEventListener("click", openDrawer);
$("scrim").addEventListener("click", closeDrawer);
$("gear").addEventListener("click", () => switchView("ajustes"));
document.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => switchView(el.dataset.nav)));
$("barWeather").addEventListener("click", () => switchView(state.config.city ? "home" : "ajustes"));
$("weatherHero").addEventListener("click", () => {
  if (!state.config.city) switchView("ajustes");
});
$("fab").addEventListener("click", () => {
  if (currentView === "finanzas") $("finAmount").focus();
  else if (currentView === "tareas") $("taskText").focus();
  else if (currentView === "habitos") $("habitName").focus();
});

// ---------- Header / saludo ----------
function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "Buenas noches" : h < 13 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}
function renderChrome() {
  const fecha = new Date().toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  $("homeGreet").textContent = `${greeting()} 👋`;
  $("homeDate").textContent = fecha;
  $("drawerDate").textContent = fecha;
}
