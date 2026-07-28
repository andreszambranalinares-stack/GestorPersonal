"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Registro rápido de movimientos", () => {
  test("el botón + abre la hoja y añade un ingreso con fecha pasada", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      save();
      switchView("finanzas");
    });
    await page.click("#fab");
    await expect(page.locator("#addSheet")).toHaveClass(/open/);
    await page.click('#qaType [data-type="ingreso"]');
    await page.fill("#qaAmount", "25");
    await page.fill("#qaDate", "2020-05-15");
    await page.fill("#qaNote", "Bizum de Ana");
    await page.click('#addForm button[type="submit"]');
    await expect(page.locator("#addSheet")).not.toHaveClass(/open/);
    const inc = await page.evaluate(() => state.incomes.map((i) => ({ amount: i.amount, note: i.note, date: i.date })));
    expect(inc).toContainEqual({ amount: 25, note: "Bizum de Ana", date: "2020-05-15" });
  });

  test("la hoja añade un gasto con su categoría", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      save();
      switchView("finanzas");
    });
    await page.click("#fab");
    await page.fill("#qaAmount", "12.5");
    await page.selectOption("#qaCat", "Comida");
    await page.fill("#qaDate", "2021-03-03");
    await page.click('#addForm button[type="submit"]');
    const exp = await page.evaluate(() => state.expenses.map((e) => ({ amount: e.amount, cat: e.cat, date: e.date })));
    expect(exp).toContainEqual({ amount: 12.5, cat: "Comida", date: "2021-03-03" });
  });

  test("editar un movimiento permite cambiar su fecha", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      state.expenses.push({ id: "x", amount: 10, cat: "Otros", note: "n", date: todayStr });
      save();
      switchView("finanzas");
      renderFinance();
    });
    await page.click('[data-edit-exp="x"]');
    await page.fill("#finDate", "2019-02-02");
    await page.click("#finSubmit");
    const d = await page.evaluate(() => state.expenses[0].date);
    expect(d).toBe("2019-02-02");
  });
});
