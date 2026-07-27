"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Notificaciones / recordatorios", () => {
  test("el interruptor guarda la preferencia", async ({ page }) => {
    await page.goto("/");
    await page.click("#gear");
    await page.check("#notifToggle");
    expect(await page.evaluate(() => state.config.notifications)).toBe(true);
    await page.uncheck("#notifToggle");
    expect(await page.evaluate(() => state.config.notifications)).toBe(false);
  });

  test("el recordatorio incluye tareas y hábitos pendientes", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      state.tasks.push({ id: "t", text: "pend", prio: "media", done: false, date: todayStr, created: todayStr });
      state.habits.push({ id: "h", name: "Leer", log: {} });
      save();
      checkTaskReminders();
    });
    await expect(page.locator("#toastHost")).toContainText("tarea");
    await expect(page.locator("#toastHost")).toContainText("hábito");
  });
});
