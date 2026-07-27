"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Validación de respaldo importado", () => {
  test("descarta entradas inválidas y normaliza config", async ({ page }) => {
    await page.goto("/");
    const res = await page.evaluate(() => {
      const parsed = JSON.parse(
        JSON.stringify({
          expenses: [
            { amount: 10, cat: "Comida", note: "válido", date: "2026-01-01" },
            { amount: -5, cat: "x", date: "2026-01-01" }, // monto no positivo
            { amount: 5, cat: "x", date: "no-es-fecha" }, // fecha inválida
          ],
          categories: ["A", "A", "", "B"], // duplicados/vacíos
          config: { theme: "malicioso", currency: "$$$$$$", budget: -3 },
        })
      );
      const { state: s, skipped } = validateImportedState(parsed);
      return {
        skipped,
        expCount: s.expenses.length,
        cats: s.categories,
        theme: s.config.theme,
        currencyLen: s.config.currency.length,
        budget: s.config.budget,
      };
    });
    expect(res.expCount).toBe(1);
    expect(res.skipped).toBeGreaterThanOrEqual(2);
    expect(res.theme).toBe("auto"); // valor no permitido → por defecto
    expect(res.currencyLen).toBeLessThanOrEqual(4); // se recorta
    expect(res.budget).toBe(0); // negativo → 0
    expect(res.cats).toContain("Otros"); // categoría de reserva siempre presente
  });

  test("no contamina Object.prototype con claves __proto__", async ({ page }) => {
    await page.goto("/");
    const polluted = await page.evaluate(() => {
      const parsed = JSON.parse('{"__proto__":{"pwned":true},"categories":["A"]}');
      validateImportedState(parsed);
      return {}.pwned === true;
    });
    expect(polluted).toBe(false);
  });

  test("un respaldo válido se acepta íntegro", async ({ page }) => {
    await page.goto("/");
    const out = await page.evaluate(() => {
      const parsed = {
        expenses: [{ amount: 3, cat: "Ocio", note: "cine", date: "2026-02-02" }],
        tasks: [{ text: "tarea", prio: "alta", done: false, date: "2026-02-02" }],
        habits: [{ name: "Leer", log: { "2026-02-02": true } }],
      };
      const { state: s, skipped } = validateImportedState(parsed);
      return { skipped, e: s.expenses.length, t: s.tasks.length, h: s.habits.length };
    });
    expect(out).toEqual({ skipped: 0, e: 1, t: 1, h: 1 });
  });
});
