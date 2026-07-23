"use strict";

// ---------- Estado ----------
const KEY = "panelPersonal.v1";
const CATS = ["Comida", "Transporte", "Hogar", "Ocio", "Salud", "Compras", "Servicios", "Otros"];
const CAT_COLOR = (i) => `var(--s${(i % 8) + 1})`;
const PRIOS = ["alta", "media", "baja"];
const THEMES = ["auto", "light", "dark"];

const defaultState = () => ({
  expenses: [], // {id, amount, cat, note, date}
  incomes: [], // {id, amount, note, date}
  goals: [], // {id, name, target, saved}
  tasks: [], // {id, text, prio, done, date, created, routineId?}
  routines: [], // {id, text, prio, repeat, dow}
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
