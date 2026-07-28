"use strict";

// ---------- Importar extracto bancario (CSV) ----------
// Parser robusto + auto-detección de columnas (fecha, importe, concepto) con un
// paso de confirmación. Sin dependencias.

// Divide una línea CSV respetando comillas dobles.
function csvSplitLine(line, delim) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Elige el delimitador que produce más columnas en las primeras líneas
// (algunos bancos, como CaixaBank, usan ';').
function detectDelim(lines) {
  const cands = [";", ",", "\t", "|"];
  let best = ";";
  let bestScore = -1;
  cands.forEach((d) => {
    const score = Math.max(...lines.map((l) => csvSplitLine(l, d).length));
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  });
  return best;
}

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };
  const delim = detectDelim(lines.slice(0, 8));
  let grid = lines.map((l) => csvSplitLine(l, delim));
  // Salta el preámbulo (títulos/observaciones con una sola columna) que algunos
  // bancos ponen antes de la tabla de movimientos.
  const startIdx = grid.findIndex((r) => r.length >= 2);
  if (startIdx > 0) grid = grid.slice(startIdx);
  // ¿La primera fila es cabecera? Lo es si NO parece un movimiento (sin fecha+importe).
  const first = grid[0] || [];
  const firstLooksData = first.some((c) => parseCsvDate(c)) && first.some((c) => Number.isFinite(parseCsvAmount(c)));
  let headers, rows;
  if (firstLooksData) {
    headers = first.map((_, i) => `Columna ${i + 1}`);
    rows = grid;
  } else {
    headers = first;
    rows = grid.slice(1);
  }
  const cols = headers.length;
  rows = rows
    .filter((r) => r.length >= 2)
    .map((r) => (r.length < cols ? r.concat(Array(cols - r.length).fill("")) : r));
  return { headers, rows };
}

// "1.234,56" | "1,234.56" | "-12,50" | "(12.50)" | "12.50 €" → número.
function parseCsvAmount(str) {
  if (typeof str !== "string") return NaN;
  let s = str.trim().replace(/[^\d.,()\-+]/g, "");
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) neg = true;
  s = s.replace(/[+-]/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // El último separador es el decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    // Coma como decimal si hay 1-2 dígitos tras ella; si no, es separador de miles.
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (hasDot) {
    // Varios puntos, o un punto con exactamente 3 dígitos detrás → separador de miles.
    const dots = (s.match(/\./g) || []).length;
    if (dots > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return neg ? -n : n;
}

// "dd/mm/yyyy" | "dd-mm-yyyy" | "dd.mm.yyyy" | "yyyy-mm-dd" → "YYYY-MM-DD".
function parseCsvDate(str) {
  if (typeof str !== "string") return "";
  const s = str.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const dd = +d,
      mm = +mo;
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return "";
    return `${y}-${pad(mm)}-${pad(dd)}`;
  }
  return "";
}

// Elige el índice de columna con más aciertos de un predicado.
function bestColumn(headers, rows, predicate, hints) {
  const scores = headers.map((h, i) => {
    let score = rows.reduce((n, r) => n + (predicate(r[i]) ? 1 : 0), 0);
    const name = String(h || "").toLowerCase();
    if (hints.some((w) => name.includes(w))) score += rows.length; // sesga por el nombre de la cabecera
    return score;
  });
  let best = -1,
    max = 0;
  scores.forEach((s, i) => {
    if (s > max) {
      max = s;
      best = i;
    }
  });
  return best;
}

function detectColumns(headers, rows) {
  const date = bestColumn(headers, rows, (v) => !!parseCsvDate(v), ["fecha", "date", "dia"]);
  const amount = bestColumn(headers, rows, (v) => Number.isFinite(parseCsvAmount(v)) && parseCsvAmount(v) !== 0, [
    "importe",
    "amount",
    "cargo",
    "abono",
    "haber",
    "debe",
    "monto",
    "valor",
  ]);
  // Concepto: columna de texto más larga que no sea fecha ni importe.
  let desc = -1,
    maxLen = -1;
  headers.forEach((h, i) => {
    if (i === date || i === amount) return;
    const name = String(h || "").toLowerCase();
    let len = rows.reduce((n, r) => n + String(r[i] || "").length, 0);
    if (["concepto", "descrip", "detalle", "movimiento", "description"].some((w) => name.includes(w))) len += 1e6;
    if (len > maxLen) {
      maxLen = len;
      desc = i;
    }
  });
  return { date, amount, desc };
}

// Clave para detectar el "mismo movimiento": día + importe + concepto + tipo.
function csvKey(date, amount, note, type) {
  return `${date}|${amount.toFixed(2)}|${(note || "").trim().toLowerCase()}|${type}`;
}

function buildCsvItems(rows, map, negIsExpense) {
  // Movimientos que ya existen en el estado, para no reimportar lo que ya tienes.
  const existing = new Set();
  state.expenses.forEach((e) => existing.add(csvKey(e.date, e.amount, e.note || "", "gasto")));
  state.incomes.forEach((e) => existing.add(csvKey(e.date, e.amount, e.note || "", "ingreso")));
  const seen = new Set();
  const items = [];
  let skipped = 0;
  rows.forEach((r) => {
    const date = parseCsvDate(r[map.date]);
    const amount = parseCsvAmount(r[map.amount]);
    if (!date || !Number.isFinite(amount) || amount === 0) {
      skipped++;
      return;
    }
    const note = String(map.desc >= 0 ? r[map.desc] || "" : "").slice(0, 140);
    const type = negIsExpense ? (amount < 0 ? "gasto" : "ingreso") : "gasto";
    const abs = Math.abs(amount);
    const key = csvKey(date, abs, note, type);
    // Duplicado: ya está en el estado, o ya apareció antes en este mismo CSV
    // (cargos pendientes repetidos hasta que se liquidan).
    const dup = existing.has(key) || seen.has(key);
    seen.add(key);
    items.push({ date, note, amount: abs, type, dup });
  });
  return { items, skipped };
}

// ---------- UI ----------
let csvData = null; // { headers, rows }
let csvItems = []; // items con bandera include (marcados/desmarcados por el usuario)
let csvSkipped = 0;

function openCsvModal(text) {
  csvData = parseCSV(text);
  if (!csvData.rows.length) {
    toast("No se han encontrado filas en el CSV.", { type: "err" });
    return;
  }
  const det = detectColumns(csvData.headers, csvData.rows);
  const opts = (sel) =>
    csvData.headers.map((h, i) => `<option value="${i}"${i === sel ? " selected" : ""}>${esc(h)}</option>`).join("");
  $("csvColDate").innerHTML = opts(det.date);
  $("csvColAmount").innerHTML = opts(det.amount);
  $("csvColDesc").innerHTML = `<option value="-1">(ninguna)</option>` + opts(det.desc);
  rebuildCsvItems();
  $("csvModal").classList.add("open");
}
function closeCsvModal() {
  $("csvModal").classList.remove("open");
  csvData = null;
  csvItems = [];
}
function csvMapping() {
  return {
    date: Number($("csvColDate").value),
    amount: Number($("csvColAmount").value),
    desc: Number($("csvColDesc").value),
  };
}
// Reconstruye la lista al cambiar el mapeo, el signo o la opción de duplicados.
function rebuildCsvItems() {
  if (!csvData) return;
  const dedup = $("csvDedup").checked;
  const { items, skipped } = buildCsvItems(csvData.rows, csvMapping(), $("csvNeg").checked);
  csvSkipped = skipped;
  // Los duplicados se desmarcan por defecto si la opción está activa.
  csvItems = items.map((it) => ({ ...it, include: dedup ? !it.dup : true }));
  renderCsvPreview();
}
function renderCsvPreview() {
  const incl = csvItems.filter((i) => i.include);
  const gastos = incl.filter((i) => i.type === "gasto").length;
  const dups = csvItems.filter((i) => i.dup).length;
  $("csvSummary").innerHTML =
    `Se importarán <b>${incl.length}</b> de ${csvItems.length} movimientos (${gastos} gastos, ${incl.length - gastos} ingresos).` +
    (dups ? ` · ${dups} posible${dups > 1 ? "s" : ""} duplicado${dups > 1 ? "s" : ""}.` : "") +
    (csvSkipped ? ` · ${csvSkipped} fila${csvSkipped > 1 ? "s" : ""} no válida${csvSkipped > 1 ? "s" : ""}.` : "");
  // Vista previa COMPLETA y desplazable; cada fila se marca/desmarca con un clic.
  $("csvPreview").innerHTML = csvItems
    .map((i, idx) => {
      const sign = i.type === "gasto" ? "−" : "+";
      const dupTag = i.dup ? ` <span class="csv-dup">duplicado</span>` : "";
      return `<div class="csv-row${i.include ? "" : " off"}" data-idx="${idx}" role="button" tabindex="0" aria-pressed="${i.include}">
        <span class="csv-check">${i.include ? "☑" : "☐"}</span>
        <span class="csv-desc">${esc(i.date)} · ${esc(i.note) || "(sin concepto)"}${dupTag}</span>
        <span class="csv-amt ${i.type === "gasto" ? "neg" : "pos"}">${sign}${money(i.amount)}</span>
      </div>`;
    })
    .join("");
}
function toggleCsvRow(idx) {
  if (!csvItems[idx]) return;
  csvItems[idx].include = !csvItems[idx].include;
  renderCsvPreview();
}
function importCsv() {
  const toAdd = csvItems.filter((i) => i.include);
  if (!toAdd.length) {
    toast("No hay movimientos seleccionados para importar.", { type: "warn" });
    return;
  }
  if (!state.categories.includes("Otros")) state.categories.push("Otros");
  toAdd.forEach((i) => {
    if (i.type === "gasto")
      state.expenses.push({ id: uid(), amount: i.amount, cat: "Otros", note: i.note, date: i.date });
    else state.incomes.push({ id: uid(), amount: i.amount, note: i.note, date: i.date });
  });
  save();
  fetchedMonths.clear();
  renderAll();
  closeCsvModal();
  toast(`Importados ${toAdd.length} movimientos del CSV.`, { type: "ok" });
}

if ($("btnCsvImport")) {
  $("btnCsvImport").addEventListener("click", () => $("csvFile").click());
  $("csvFile").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        openCsvModal(String(rd.result));
      } catch {
        toast("No se pudo leer el CSV.", { type: "err" });
      }
    };
    rd.readAsText(f);
  });
  $("csvClose").addEventListener("click", closeCsvModal);
  $("csvCancelBtn").addEventListener("click", closeCsvModal);
  $("csvImportBtn").addEventListener("click", importCsv);
  $("csvModal").addEventListener("click", (e) => {
    if (e.target.id === "csvModal") closeCsvModal();
  });
  ["csvColDate", "csvColAmount", "csvColDesc", "csvNeg", "csvDedup"].forEach((id) =>
    $(id).addEventListener("change", rebuildCsvItems)
  );
  // Marcar/desmarcar una fila de la vista previa (clic o teclado).
  $("csvPreview").addEventListener("click", (e) => {
    const row = e.target.closest("[data-idx]");
    if (row) toggleCsvRow(Number(row.dataset.idx));
  });
  $("csvPreview").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest("[data-idx]");
    if (row) {
      e.preventDefault();
      toggleCsvRow(Number(row.dataset.idx));
    }
  });
}
