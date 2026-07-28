"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Salud financiera", () => {
  test("proyecta el gasto de fin de mes según el ritmo", async ({ page }) => {
    await page.goto("/");
    const proj = await page.evaluate(() => {
      state = defaultState();
      const mo = curMonth();
      const dim = new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)), 0).getDate();
      const day = Math.min(new Date().getDate(), dim);
      // Gasta 10 por cada día transcurrido → proyección ≈ 10 * díasDelMes.
      for (let d = 1; d <= day; d++) {
        state.expenses.push({
          id: "e" + d,
          amount: 10,
          cat: "Otros",
          note: "",
          date: `${mo}-${String(d).padStart(2, "0")}`,
        });
      }
      save();
      return { h: financialHealth(mo), dim };
    });
    // Proyección esperada ≈ 10 * díasDelMes (con tolerancia por el redondeo del día).
    expect(proj.h.projection).toBeGreaterThan(proj.dim * 10 - 0.01);
    expect(proj.h.projection).toBeLessThan(proj.dim * 10 + 0.01);
  });

  test("detecta suscripciones repetidas y no las que ya son fijas", async ({ page }) => {
    await page.goto("/");
    const subs = await page.evaluate(() => {
      state = defaultState();
      // Netflix 9.99 en tres meses → suscripción.
      ["2026-01-03", "2026-02-03", "2026-03-03"].forEach((d, i) =>
        state.expenses.push({ id: "n" + i, amount: 9.99, cat: "Ocio", note: "Netflix", date: d })
      );
      // Un gasto suelto que no debe sugerirse.
      state.expenses.push({ id: "x", amount: 42, cat: "Comida", note: "cena", date: "2026-03-10" });
      save();
      return financialHealth("2026-03").subs;
    });
    expect(subs.length).toBe(1);
    expect(subs[0]).toMatchObject({ amount: 9.99, note: "Netflix", months: 3 });
  });

  test("añadir una suscripción la registra como gasto fijo", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      state = defaultState();
      ["2026-01-03", "2026-02-03"].forEach((d, i) =>
        state.expenses.push({ id: "s" + i, amount: 12, cat: "Servicios", note: "Spotify", date: d })
      );
      save();
      $("finMonth").value = "2026-02";
      renderFinance();
    });
    await page.click('.navbtn[data-nav="finanzas"]');
    await page.click('#healthBox [data-add-sub="0"]');
    const fixed = await page.evaluate(() => state.fixedExpenses.map((f) => ({ amount: f.amount, note: f.note })));
    expect(fixed).toContainEqual({ amount: 12, note: "Spotify" });
  });
});
