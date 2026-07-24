"use strict";

// ---------- Config / tema ----------
function applyTheme() {
  const t = state.config.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  $("themeSel").value = t;
}
function renderConfig() {
  $("cfgCity").value = state.config.city;
  $("cfgCurrency").value = state.config.currency;
  $("cfgBudget").value = state.config.budget ? state.config.budget : "";
  applyTheme();
}
function renderFocus() {
  if (state.focus.date !== todayStr) state.focus = { date: todayStr, text: "" };
  $("focusNote").value = state.focus.text || "";
}

// ---------- Foco ----------
$("focusNote").addEventListener("input", (e) => {
  state.focus = { date: todayStr, text: e.target.value };
  save();
});

// ---------- Config ----------
$("cfgCitySave").addEventListener("click", () => {
  state.config.city = $("cfgCity").value.trim();
  state.config.lat = null;
  state.config.lon = null;
  state.config.geoCity = "";
  fetchedMonths.clear();
  save();
  loadWeather();
  if (state.config.city) switchView("home");
});
$("cfgCurrency").addEventListener("input", (e) => {
  state.config.currency = e.target.value || "$";
  save();
  renderFinance();
  renderMonthlySummary();
  renderCalendar();
  renderHome();
  renderGoals();
});
$("cfgBudget").addEventListener("input", (e) => {
  state.config.budget = parseFloat(e.target.value) || 0;
  save();
  renderBalance();
});
$("themeSel").addEventListener("change", (e) => {
  state.config.theme = e.target.value;
  save();
  applyTheme();
});
