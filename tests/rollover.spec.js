"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Recurrencias y arrastre", () => {
  test("las tareas pendientes de días pasados se arrastran a hoy; las hechas no", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      state = defaultState();
      state.tasks.push({
        id: "p",
        text: "pendiente vieja",
        prio: "media",
        done: false,
        date: "2000-01-01",
        created: "2000-01-01",
      });
      state.tasks.push({
        id: "d",
        text: "hecha vieja",
        prio: "media",
        done: true,
        date: "2000-01-02",
        created: "2000-01-02",
      });
      save();
      rolloverTasks();
      const by = (id) => state.tasks.find((t) => t.id === id);
      return { pendiente: by("p").date, hecha: by("d").date, hoy: todayStr };
    });
    expect(r.pendiente).toBe(r.hoy); // arrastrada a hoy
    expect(r.hecha).toBe("2000-01-02"); // la hecha se queda
  });

  test("una rutina diaria crea una tarea para hoy sin duplicar", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      state = defaultState();
      state.routines.push({ id: "rt", text: "Meditar", prio: "media", repeat: "diario", dow: 0 });
      save();
      rolloverTasks();
      rolloverTasks(); // segunda vez: no debe duplicar
      const hoy = state.tasks.filter((t) => t.routineId === "rt" && t.date === todayStr);
      return { count: hoy.length, text: hoy[0] && hoy[0].text };
    });
    expect(r.count).toBe(1);
    expect(r.text).toBe("Meditar");
  });

  test("un gasto fijo se registra una vez al mes", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      state = defaultState();
      state.fixedExpenses.push({ id: "f", amount: 50, cat: "Servicios", note: "Internet", day: 1 });
      save();
      rolloverFixedExpenses();
      rolloverFixedExpenses(); // no duplica
      const mine = state.expenses.filter((e) => e.fixedId === "f");
      return { count: mine.length, amount: mine[0] && mine[0].amount, month: mine[0] && mine[0].date.slice(0, 7) };
    });
    expect(r.count).toBe(1);
    expect(r.amount).toBe(50);
    expect(r.month).toBe(new Date().toISOString().slice(0, 7));
  });
});
