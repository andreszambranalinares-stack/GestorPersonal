"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Finanzas", () => {
  test("añadir un gasto lo registra en el estado y la lista", async ({ page }) => {
    await page.goto("/");
    await page.click('.navbtn[data-nav="finanzas"]');
    await page.fill("#finAmount", "12.50");
    await page.fill("#finNote", "Café de prueba");
    await page.click("#finSubmit");
    const exp = await page.evaluate(() => state.expenses.map((e) => ({ amount: e.amount, note: e.note })));
    expect(exp).toHaveLength(1);
    expect(exp[0].amount).toBe(12.5);
    expect(exp[0].note).toBe("Café de prueba");
    await expect(page.locator("#finList")).toContainText("Café de prueba");
  });

  test("eliminar un gasto lo quita del estado", async ({ page }) => {
    await page.goto("/");
    const id = await page.evaluate(() => {
      state.expenses.push({ id: "x1", amount: 9, cat: "Otros", note: "borrable", date: todayStr });
      save();
      renderAll();
      return "x1";
    });
    await page.click('.navbtn[data-nav="finanzas"]');
    await page.click(`[data-del-exp="${id}"]`);
    const n = await page.evaluate(() => state.expenses.length);
    expect(n).toBe(0);
  });

  test("un ingreso actualiza el balance del mes", async ({ page }) => {
    await page.goto("/");
    await page.click('.navbtn[data-nav="finanzas"]');
    await page.click('#txType [data-type="ingreso"]');
    await page.fill("#finAmount", "1500");
    await page.fill("#finNote", "Nómina");
    await page.click("#finSubmit");
    const incomes = await page.evaluate(() => state.incomes.length);
    expect(incomes).toBe(1);
    await expect(page.locator("#balIn")).toContainText("1500");
  });
});
