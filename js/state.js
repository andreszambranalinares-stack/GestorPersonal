"use strict";

// ---------- Estado ----------
const KEY = "panelPersonal.v1";
const DEFAULT_CATEGORIES = ["Comida", "Transporte", "Hogar", "Ocio", "Salud", "Compras", "Servicios", "Otros"];
const CAT_COLOR = (i) => `var(--s${(i % 8) + 1})`;
const PRIOS = ["alta", "media", "baja"];
const THEMES = ["auto", "light", "dark"];

// Color estable para una categoría: por su posición en state.categories; si no
// está en la lista (categoría huérfana de un gasto viejo) se deriva por hash del nombre.
function catColor(name) {
  const idx = (state.categories || []).indexOf(name);
  if (idx >= 0) return CAT_COLOR(idx);
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return CAT_COLOR(h);
}

const defaultState = () => ({
  expenses: [], // {id, amount, cat, note, date, fixedId?}
  incomes: [], // {id, amount, note, date}
  goals: [], // {id, name, target, saved}
  tasks: [], // {id, text, prio, done, date, created, routineId?}
  routines: [], // {id, text, prio, repeat, dow}
  fixedExpenses: [], // {id, amount, cat, note, day}
  categories: DEFAULT_CATEGORIES.slice(), // nombres de categorías de gasto (editables)
  habits: [], // {id, name, log:{ "YYYY-MM-DD": true }}
  focus: { date: "", text: "" },
  weatherLog: {}, // { "YYYY-MM-DD": {max, min, code} }
  config: {
    city: "",
    currency: "$",
    theme: "auto",
    budget: 0,
    lat: null,
    lon: null,
    geoCity: "",
    geoName: "",
    lastBackupAt: null, // "YYYY-MM-DD" de la última exportación exitosa
  },
});

let stateLoadError = false;
let state = load();
function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultState();
  try {
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch {
    stateLoadError = true;
    return defaultState();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const $ = (id) => document.getElementById(id);
