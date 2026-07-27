"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Gestión de datos", () => {
  test("renombrar un hábito desde la vista Hábitos", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state.habits.push({ id: "h1", name: "Nombre viejo", log: {} });
      save();
      renderHabits();
    });
    await page.click('.navbtn[data-nav="habitos"]');
    page.once("dialog", (d) => d.accept("Nombre nuevo"));
    await page.click('[data-rename-habit="h1"]');
    await expect.poll(() => page.evaluate(() => state.habits[0].name)).toBe("Nombre nuevo");
  });

  test("reordenar categorías con las flechas", async ({ page }) => {
    await page.goto("/");
    const before = await page.evaluate(() => state.categories.slice(0, 2));
    await page.click("#gear"); // Ajustes
    await page.click(`[data-cat-down="${before[0]}"]`);
    const after = await page.evaluate(() => state.categories.slice(0, 2));
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
  });
});
