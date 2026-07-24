"use strict";

// ---------- Respaldo ----------
function validateImportedState(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid backup");
  let skipped = 0;
  const arr = (v) => (Array.isArray(v) ? v : []);
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const out = defaultState();

  // Categorías: lista de nombres saneados y sin duplicados; si viene vacía/inválida, se usan las por defecto.
  const seenCat = new Set();
  const importedCats = arr(parsed.categories)
    .map((c) => str(c, 40).trim())
    .filter((c) => {
      const k = c.toLowerCase();
      if (!c || seenCat.has(k)) return false;
      seenCat.add(k);
      return true;
    });
  out.categories = importedCats.length ? importedCats : DEFAULT_CATEGORIES.slice();
  if (!out.categories.includes("Otros")) out.categories.push("Otros");
  const catSet = new Set(out.categories);

  out.expenses = arr(parsed.expenses)
    .map((e) => {
      const amount = e && num(e.amount);
      if (!e || typeof e !== "object" || amount === null || !(amount > 0) || !isDate(e.date)) {
        skipped++;
        return null;
      }
      const cat = str(e.cat, 40) || "Otros";
      // Une al catálogo cualquier categoría usada por un gasto para no dejar huérfanos.
      if (!catSet.has(cat)) {
        catSet.add(cat);
        out.categories.push(cat);
      }
      return {
        id: str(e.id, 40) || uid(),
        amount,
        cat,
        note: str(e.note, 140),
        date: e.date,
        fixedId: typeof e.fixedId === "string" ? str(e.fixedId, 40) : undefined,
      };
    })
    .filter(Boolean);

  out.incomes = arr(parsed.incomes)
    .map((e) => {
      const amount = e && num(e.amount);
      if (!e || typeof e !== "object" || amount === null || !(amount > 0) || !isDate(e.date)) {
        skipped++;
        return null;
      }
      return { id: str(e.id, 40) || uid(), amount, note: str(e.note, 140), date: e.date };
    })
    .filter(Boolean);

  out.goals = arr(parsed.goals)
    .map((g) => {
      const target = g && num(g.target);
      if (!g || typeof g !== "object" || !g.name || target === null || !(target > 0)) {
        skipped++;
        return null;
      }
      const saved = num(g.saved);
      return {
        id: str(g.id, 40) || uid(),
        name: str(g.name, 60),
        target,
        saved: saved !== null && saved >= 0 ? saved : 0,
      };
    })
    .filter(Boolean);

  out.tasks = arr(parsed.tasks)
    .map((t) => {
      if (!t || typeof t !== "object" || !t.text) {
        skipped++;
        return null;
      }
      const date = isDate(t.date) ? t.date : todayStr;
      return {
        id: str(t.id, 40) || uid(),
        text: str(t.text, 140),
        prio: PRIOS.includes(t.prio) ? t.prio : "media",
        done: !!t.done,
        date,
        created: isDate(t.created) ? t.created : date,
        routineId: typeof t.routineId === "string" ? str(t.routineId, 40) : undefined,
      };
    })
    .filter(Boolean);

  out.routines = arr(parsed.routines)
    .map((rt) => {
      if (!rt || typeof rt !== "object" || !rt.text || !REPEATS.includes(rt.repeat)) {
        skipped++;
        return null;
      }
      const dow = Number.isInteger(rt.dow) && rt.dow >= 0 && rt.dow <= 6 ? rt.dow : new Date().getDay();
      return {
        id: str(rt.id, 40) || uid(),
        text: str(rt.text, 140),
        prio: PRIOS.includes(rt.prio) ? rt.prio : "media",
        repeat: rt.repeat,
        dow,
      };
    })
    .filter(Boolean);

  out.fixedExpenses = arr(parsed.fixedExpenses)
    .map((fe) => {
      const amount = fe && num(fe.amount);
      if (!fe || typeof fe !== "object" || amount === null || !(amount > 0)) {
        skipped++;
        return null;
      }
      const day = Number.isInteger(fe.day) && fe.day >= 1 && fe.day <= 28 ? fe.day : 1;
      const cat = str(fe.cat, 40) || "Otros";
      if (!catSet.has(cat)) {
        catSet.add(cat);
        out.categories.push(cat);
      }
      return { id: str(fe.id, 40) || uid(), amount, cat, note: str(fe.note, 140), day };
    })
    .filter(Boolean);

  out.habits = arr(parsed.habits)
    .map((h) => {
      if (!h || typeof h !== "object" || !h.name) {
        skipped++;
        return null;
      }
      const log = {};
      if (h.log && typeof h.log === "object" && !Array.isArray(h.log)) {
        Object.keys(h.log).forEach((k) => {
          if (isDate(k) && h.log[k]) log[k] = true;
        });
      }
      return { id: str(h.id, 40) || uid(), name: str(h.name, 60), log };
    })
    .filter(Boolean);

  if (parsed.focus && typeof parsed.focus === "object" && isDate(parsed.focus.date)) {
    out.focus = { date: parsed.focus.date, text: str(parsed.focus.text, 300) };
  }

  if (parsed.weatherLog && typeof parsed.weatherLog === "object" && !Array.isArray(parsed.weatherLog)) {
    Object.keys(parsed.weatherLog).forEach((k) => {
      const w = parsed.weatherLog[k];
      const max = w && num(w.max),
        min = w && num(w.min);
      if (isDate(k) && w && typeof w === "object" && max !== null && min !== null) {
        out.weatherLog[k] = { max, min, code: Number.isFinite(w.code) ? w.code : 0 };
      }
    });
  }

  if (parsed.config && typeof parsed.config === "object") {
    const c = parsed.config;
    out.config.city = str(c.city, 80);
    out.config.currency = str(c.currency, 4) || "$";
    out.config.theme = THEMES.includes(c.theme) ? c.theme : "auto";
    const budget = num(c.budget);
    out.config.budget = budget !== null && budget >= 0 ? budget : 0;
    const lat = num(c.lat),
      lon = num(c.lon);
    out.config.lat = lat;
    out.config.lon = lon;
    out.config.geoCity = str(c.geoCity, 80);
    out.config.geoName = str(c.geoName, 80);
    out.config.lastBackupAt = isDate(c.lastBackupAt) ? c.lastBackupAt : null;
  }

  return { state: out, skipped };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `panel-personal-${todayStr}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  state.config.lastBackupAt = todayStr;
  save();
}
const BACKUP_REMINDER_DAYS = 30;
function daysSince(dateStr) {
  return Math.floor((new Date(todayStr) - new Date(dateStr)) / 86400000);
}
function checkBackupReminder() {
  const last = state.config.lastBackupAt;
  if (last && daysSince(last) < BACKUP_REMINDER_DAYS) return;
  toast("Hace tiempo que no exportas un respaldo. Guarda tus datos por si acaso.", {
    type: "warn",
    duration: 10000,
    actionLabel: "Exportar ahora",
    onAction: exportBackup,
  });
}
$("btnExport").addEventListener("click", exportBackup);
$("btnImport").addEventListener("click", () => $("fileImport").click());
$("fileImport").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const parsed = JSON.parse(rd.result);
      const { state: validated, skipped } = validateImportedState(parsed);
      state = validated;
      fetchedMonths.clear();
      save();
      initValues();
      renderAll();
      loadWeather();
      toast(
        skipped
          ? `Respaldo importado. Se omitieron ${skipped} elemento${skipped > 1 ? "s" : ""} no válido${skipped > 1 ? "s" : ""}.`
          : "Respaldo importado correctamente.",
        { type: skipped ? "warn" : "ok" }
      );
    } catch {
      toast("El archivo no es un respaldo válido.", { type: "err" });
    }
  };
  rd.readAsText(f);
});
function csvCell(v) {
  v = String(v == null ? "" : v);
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
$("btnCsv").addEventListener("click", () => {
  if (!state.expenses.length) {
    alert("Aún no tienes gastos que exportar.");
    return;
  }
  const rows = [["fecha", "categoria", "nota", "monto"]];
  state.expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => rows.push([e.date, e.cat, e.note || "", String(e.amount)]));
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gastos-${todayStr}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$("btnReset").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar TODOS tus datos?")) return;
  const snapshot = state;
  state = defaultState();
  fetchedMonths.clear();
  calMonth = curMonth();
  save();
  initValues();
  renderAll();
  loadWeather();
  switchView("home");
  toast("Todos los datos fueron borrados.", {
    type: "warn",
    duration: 8000,
    actionLabel: "Deshacer",
    onAction: () => {
      state = snapshot;
      fetchedMonths.clear();
      save();
      initValues();
      renderAll();
      loadWeather();
    },
  });
});
