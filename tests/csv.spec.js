"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Importar CSV del banco", () => {
  test("parsea importes en distintos formatos", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => ({
      a: parseCsvAmount("1.234,56"),
      b: parseCsvAmount("1,234.56"),
      c: parseCsvAmount("-12,50"),
      d: parseCsvAmount("(30.00)"),
      e: parseCsvAmount("12,50 €"),
      f: parseCsvAmount("2.000"),
    }));
    expect(r.a).toBeCloseTo(1234.56);
    expect(r.b).toBeCloseTo(1234.56);
    expect(r.c).toBeCloseTo(-12.5);
    expect(r.d).toBeCloseTo(-30);
    expect(r.e).toBeCloseTo(12.5);
    expect(r.f).toBeCloseTo(2000); // sin decimales: punto como miles
  });

  test("parsea fechas en distintos formatos", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => ({
      a: parseCsvDate("05/03/2026"),
      b: parseCsvDate("2026-03-05"),
      c: parseCsvDate("5.3.26"),
      d: parseCsvDate("no es fecha"),
    }));
    expect(r).toEqual({ a: "2026-03-05", b: "2026-03-05", c: "2026-03-05", d: "" });
  });

  test("detecta columnas y construye movimientos con signo", async ({ page }) => {
    await page.goto("/");
    const out = await page.evaluate(() => {
      const csv = ["Fecha;Concepto;Importe", "05/03/2026;Nomina;1.500,00", "06/03/2026;Super;-45,20"].join("\n");
      const { headers, rows } = parseCSV(csv);
      const map = detectColumns(headers, rows);
      const { items } = buildCsvItems(rows, map, true);
      return { headers, map, items };
    });
    expect(out.map.date).toBe(0);
    expect(out.map.amount).toBe(2);
    expect(out.items).toEqual([
      { date: "2026-03-05", note: "Nomina", amount: 1500, type: "ingreso", dup: false },
      { date: "2026-03-06", note: "Super", amount: 45.2, type: "gasto", dup: false },
    ]);
  });

  test("marca como duplicado un cargo repetido en el CSV o ya existente", async ({ page }) => {
    await page.goto("/");
    const out = await page.evaluate(() => {
      state = defaultState();
      // Un gasto que ya existe en el estado (import previo).
      state.expenses.push({ id: "x", amount: 12.3, cat: "Otros", note: "Bar Pepe", date: "2026-03-10" });
      save();
      // CSV con: el mismo cargo repetido 3 veces (pendiente→liquidado) y uno ya existente.
      const csv = [
        "Fecha;Concepto;Importe",
        "2026-03-12;Cargo pendiente;-9,99",
        "2026-03-12;Cargo pendiente;-9,99",
        "2026-03-12;Cargo pendiente;-9,99",
        "2026-03-10;Bar Pepe;-12,30",
      ].join("\n");
      const { headers, rows } = parseCSV(csv);
      const { items } = buildCsvItems(rows, detectColumns(headers, rows), true);
      return items.map((i) => ({ note: i.note, dup: i.dup }));
    });
    // El primer "Cargo pendiente" es nuevo; las dos repeticiones y el "Bar Pepe" ya
    // existente son duplicados.
    expect(out).toEqual([
      { note: "Cargo pendiente", dup: false },
      { note: "Cargo pendiente", dup: true },
      { note: "Cargo pendiente", dup: true },
      { note: "Bar Pepe", dup: true },
    ]);
  });

  test("el modal excluye duplicados por defecto y permite re-incluirlos", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      save();
      const csv = ["Fecha,Concepto,Importe", "2026-03-12,Pendiente,-5.00", "2026-03-12,Pendiente,-5.00"].join("\n");
      openCsvModal(csv);
    });
    // Dos filas, una marcada como duplicada → se importará 1 por defecto.
    await expect(page.locator("#csvSummary")).toContainText("1 de 2");
    await expect(page.locator("#csvPreview .csv-dup")).toHaveCount(1);
    await page.click("#csvImportBtn");
    const n = await page.evaluate(() => state.expenses.length);
    expect(n).toBe(1);
  });

  test("importa el CSV a través del modal", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      save();
      const csv = ["Fecha,Concepto,Importe", "05/03/2026,Nomina,1500.00", "06/03/2026,Compra,-20.00"].join("\n");
      openCsvModal(csv);
    });
    await expect(page.locator("#csvModal")).toHaveClass(/open/);
    await expect(page.locator("#csvSummary")).toContainText("2");
    await page.click("#csvImportBtn");
    const s = await page.evaluate(() => ({ exp: state.expenses.length, inc: state.incomes.length }));
    expect(s).toEqual({ exp: 1, inc: 1 });
    await expect(page.locator("#csvModal")).not.toHaveClass(/open/);
  });
});
