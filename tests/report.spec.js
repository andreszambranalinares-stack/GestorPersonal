"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Informe mensual", () => {
  test("calcula totales, categorías y productividad del mes", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      state = defaultState();
      state.expenses.push({ id: "a", amount: 20, cat: "Comida", note: "x", date: "2026-03-05" });
      state.expenses.push({ id: "b", amount: 30, cat: "Comida", note: "y", date: "2026-03-10" });
      state.expenses.push({ id: "c", amount: 50, cat: "Ocio", note: "cine", date: "2026-03-12" });
      state.expenses.push({ id: "d", amount: 999, cat: "Ocio", note: "otro mes", date: "2026-04-01" });
      state.incomes.push({ id: "i", amount: 200, note: "n", date: "2026-03-01" });
      state.tasks.push({
        id: "t",
        text: "hecha",
        prio: "media",
        done: true,
        date: "2026-03-02",
        created: "2026-03-02",
      });
      state.habits.push({ id: "h", name: "Leer", log: { "2026-03-01": true, "2026-03-02": true, "2026-04-09": true } });
      return buildMonthlyReport("2026-03");
    });
    expect(r.totalOut).toBe(100); // 20+30+50 (abril excluido)
    expect(r.totalIn).toBe(200);
    expect(r.net).toBe(100);
    expect(r.cats[0]).toEqual({ c: "Comida", v: 50, pct: 50 }); // categoría mayor
    expect(r.tasksDone).toBe(1);
    expect(r.habits[0]).toEqual({ name: "Leer", days: 2 }); // solo días de marzo

    // El contenedor imprimible se rellena y escapa el contenido.
    await expect(page.locator("#reportRoot")).toContainText("Informe de");
    await expect(page.locator("#reportRoot")).toContainText("Comida");
  });
});
