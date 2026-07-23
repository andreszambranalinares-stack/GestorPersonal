"use strict";

// ---------- Clima (Open-Meteo, sin API key) ----------
const WCODE = {
  0: ["☀️", "Despejado"],
  1: ["🌤️", "Mayormente despejado"],
  2: ["⛅", "Parcialmente nublado"],
  3: ["☁️", "Nublado"],
  45: ["🌫️", "Niebla"],
  48: ["🌫️", "Niebla"],
  51: ["🌦️", "Llovizna"],
  53: ["🌦️", "Llovizna"],
  55: ["🌦️", "Llovizna"],
  61: ["🌧️", "Lluvia"],
  63: ["🌧️", "Lluvia"],
  65: ["🌧️", "Lluvia fuerte"],
  66: ["🌧️", "Lluvia helada"],
  67: ["🌧️", "Lluvia helada"],
  71: ["🌨️", "Nieve"],
  73: ["🌨️", "Nieve"],
  75: ["❄️", "Nieve fuerte"],
  77: ["🌨️", "Aguanieve"],
  80: ["🌦️", "Chubascos"],
  81: ["🌦️", "Chubascos"],
  82: ["⛈️", "Chubascos fuertes"],
  85: ["🌨️", "Chubascos de nieve"],
  86: ["🌨️", "Chubascos de nieve"],
  95: ["⛈️", "Tormenta"],
  96: ["⛈️", "Tormenta con granizo"],
  99: ["⛈️", "Tormenta con granizo"],
};
async function ensureCoords() {
  if (!state.config.city) return null;
  if (state.config.lat != null && state.config.lon != null && state.config.geoCity === state.config.city) {
    return { lat: state.config.lat, lon: state.config.lon, name: state.config.geoName || state.config.city };
  }
  const g = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(state.config.city)}&count=1&language=es&format=json`
  ).then((r) => r.json());
  if (!g.results || !g.results.length) return null;
  const r0 = g.results[0];
  state.config.lat = r0.latitude;
  state.config.lon = r0.longitude;
  state.config.geoCity = state.config.city;
  state.config.geoName = r0.name;
  save();
  return { lat: r0.latitude, lon: r0.longitude, name: r0.name };
}
async function loadWeather() {
  if (!state.config.city) {
    $("hCity").textContent = "Configura tu ciudad";
    $("hTemp").textContent = "--°";
    $("hDesc").textContent = "toca ⚙️ para añadirla";
    $("hIcon").textContent = "🌡️";
    $("barTemp").textContent = "--°";
    $("barIcon").textContent = "🌡️";
    return;
  }
  $("hCity").textContent = state.config.city;
  $("hDesc").textContent = "cargando…";
  try {
    const c = await ensureCoords();
    if (!c) {
      $("hDesc").textContent = "ciudad no encontrada";
      $("hIcon").textContent = "❓";
      return;
    }
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
    ).then((r) => r.json());
    const t = Math.round(w.current.temperature_2m);
    const [ic, txt] = WCODE[w.current.weather_code] || ["🌡️", "—"];
    const mx = Math.round(w.daily.temperature_2m_max[0]),
      mn = Math.round(w.daily.temperature_2m_min[0]);
    $("hCity").textContent = c.name;
    $("hTemp").textContent = `${t}°`;
    $("hIcon").textContent = ic;
    $("hDesc").textContent = `${txt} · ↑${mx}° ↓${mn}°`;
    $("barTemp").textContent = `${t}°`;
    $("barIcon").textContent = ic;
    state.weatherLog[todayStr] = { max: mx, min: mn, code: w.current.weather_code };
    save();
    renderCalendar();
  } catch {
    $("hDesc").textContent = "sin conexión";
    $("hIcon").textContent = "📡";
    $("barIcon").textContent = "📡";
    toast("No se pudo obtener el clima. Revisa tu conexión.", { type: "warn" });
  }
}
const fetchedMonths = new Set();
async function fetchHistoryForMonth(monthStr) {
  if (!state.config.city || fetchedMonths.has(monthStr)) return;
  if (monthStr > curMonth()) return;
  const c = await ensureCoords();
  if (!c) return;
  fetchedMonths.add(monthStr);
  const [y, m] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  let end = `${monthStr}-${pad(lastDay)}`;
  if (end > todayStr) end = todayStr;
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;
    const d = await fetch(url).then((r) => r.json());
    if (d.daily && d.daily.time) {
      d.daily.time.forEach((t, i) => {
        const mx = d.daily.temperature_2m_max[i];
        if (mx != null)
          state.weatherLog[t] = {
            max: Math.round(mx),
            min: Math.round(d.daily.temperature_2m_min[i]),
            code: d.daily.weather_code[i],
          };
      });
      save();
      renderCalendar();
    }
  } catch {
    fetchedMonths.delete(monthStr);
  }
}
