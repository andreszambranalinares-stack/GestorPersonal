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

function detectDelim(sample) {
  const cands = [",", ";", "\t", "|"];
  let best = ",";
  let max = -1;
  cands.forEach((d) => {
    const n = (sample.match(new RegExp("\\" + d, "g")) || []).length;
    if (n > max) {
      max = n;
      best = d;
    }
  });
  return best;
}

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };
  const delim = detectDelim(lines[0]);
  const grid = lines.map((l) => csvSplitLine(l, delim));
  // ¿La primera fila es cabecera? Lo es si NO parece un movimiento (sin fecha+importe).
  const first = grid[0];
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

function buildCsvItems(rows, map, negIsExpense) {
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
    items.push({ date, note, amount: Math.abs(amount), type });
  });
  return { items, skipped };
}

// ---------- UI ----------
let csvData = null; // { headers, rows }

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
  renderCsvPreview();
  $("csvModal").classList.add("open");
}
function closeCsvModal() {
  $("csvModal").classList.remove("open");
  csvData = null;
}
function csvMapping() {
  return {
    date: Number($("csvColDate").value),
    amount: Number($("csvColAmount").value),
    desc: Number($("csvColDesc").value),
  };
}
function renderCsvPreview() {
  if (!csvData) return;
  const negIsExpense = $("csvNeg").checked;
  const { items, skipped } = buildCsvItems(csvData.rows, csvMapping(), negIsExpense);
  const gastos = items.filter((i) => i.type === "gasto").length;
  const ingresos = items.length - gastos;
  $("csvSummary").innerHTML =
    `Se importarán <b>${items.length}</b> movimientos (${gastos} gastos, ${ingresos} ingresos).` +
    (skipped ? ` Se omitirán ${skipped} filas no válidas.` : "");
  $("csvPreview").innerHTML = items
    .slice(0, 6)
    .map(
      (i) =>
        `<div class="rt"><span style="flex:1 1 auto">${esc(i.date)} · ${esc(i.note) || "(sin concepto)"}</span>
      <span class="${i.type === "gasto" ? "neg" : "pos"}">${i.type === "gasto" ? "−" : "+"}${money(i.amount)}</span></div>`
    )
    .join("");
}
function importCsv() {
  if (!csvData) return;
  const { items } = buildCsvItems(csvData.rows, csvMapping(), $("csvNeg").checked);
  if (!items.length) {
    toast("No hay movimientos válidos para importar.", { type: "warn" });
    return;
  }
  const catSet = new Set(state.categories);
  if (!catSet.has("Otros")) state.categories.push("Otros");
  items.forEach((i) => {
    if (i.type === "gasto")
      state.expenses.push({ id: uid(), amount: i.amount, cat: "Otros", note: i.note, date: i.date });
    else state.incomes.push({ id: uid(), amount: i.amount, note: i.note, date: i.date });
  });
  save();
  fetchedMonths.clear();
  renderAll();
  closeCsvModal();
  toast(`Importados ${items.length} movimientos del CSV.`, { type: "ok" });
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
  ["csvColDate", "csvColAmount", "csvColDesc", "csvNeg"].forEach((id) =>
    $(id).addEventListener("change", renderCsvPreview)
  );
}
