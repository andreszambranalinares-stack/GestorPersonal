"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Inicio", () => {
  test("muestra ingresos, gastos y saldo del mes en curso", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      const mo = curMonth();
      state.incomes.push({ id: "i", amount: 1500, note: "", date: `${mo}-05` });
      state.expenses.push({ id: "e", amount: 200, cat: "Otros", note: "", date: `${mo}-06` });
      state.expenses.push({ id: "e2", amount: 999, cat: "Otros", note: "", date: "2000-01-01" }); // otro mes, excluido
      save();
      renderHome();
    });
    await expect(page.locator("#homeIn")).toContainText("1500");
    await expect(page.locator("#homeOut")).toContainText("200");
    await expect(page.locator("#homeNet")).toContainText("1300");
  });
});
