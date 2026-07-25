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
  renderCatSelects();
  renderCategories();
  renderCloud();
}

// ---------- Categorías personalizadas ----------
function renderCategories() {
  const box = $("categoryList");
  if (!box) return;
  const budgets = state.config.categoryBudgets || {};
  box.innerHTML = state.categories
    .map(
      (c, i) =>
        `<div class="rt"><span class="cat-dot" style="background:${CAT_COLOR(i)}"></span>
      <span style="flex:1 1 auto;">${esc(c)}</span>
      <input type="number" min="0" step="1" inputmode="decimal" class="cat-budget-input" data-catbudget="${esc(c)}" value="${budgets[c] || ""}" placeholder="límite/mes" title="Presupuesto mensual (vacío = sin límite)" />
      ${c === "Otros" ? `<span class="rt-rep" title="Categoría de reserva">fija</span>` : `<button class="icon-btn" data-del-cat="${esc(c)}" title="Eliminar categoría">✕</button>`}</div>`
    )
    .join("");
}
// Guardar presupuesto por categoría al escribir en su input.
$("categoryList").addEventListener("input", (e) => {
  const inp = e.target.closest("[data-catbudget]");
  if (!inp) return;
  const name = inp.dataset.catbudget;
  const v = parseFloat(inp.value);
  if (!state.config.categoryBudgets) state.config.categoryBudgets = {};
  if (v > 0) state.config.categoryBudgets[name] = v;
  else delete state.config.categoryBudgets[name];
  save();
  renderCategoryBudgets();
});
$("categoryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("categoryName").value.trim();
  if (!name) return;
  if (state.categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
    toast("Esa categoría ya existe; sus gastos se suman bajo ese nombre.", { type: "warn" });
    $("categoryName").value = "";
    return;
  }
  state.categories.push(name);
  $("categoryName").value = "";
  save();
  renderCategories();
  renderCatSelects();
  toast(`Categoría "${name}" añadida.`, { type: "ok" });
});
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
