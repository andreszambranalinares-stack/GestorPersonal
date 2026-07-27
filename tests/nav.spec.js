"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Navegación", () => {
  test("móvil: barra inferior con 5 destinos y Ajustes oculto", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    for (const v of ["home", "finanzas", "tareas", "habitos", "calendario"]) {
      await expect(page.locator(`.navbtn[data-nav="${v}"]`)).toBeVisible();
    }
    await expect(page.locator('.navbtn[data-nav="ajustes"]')).toBeHidden();
  });

  test("cambiar de vista actualiza vista activa y título", async ({ page }) => {
    await page.goto("/");
    await page.click('.navbtn[data-nav="finanzas"]');
    await expect(page.locator("#view-finanzas")).toBeVisible();
    await expect(page.locator('.navbtn[data-nav="finanzas"]')).toHaveClass(/active/);
    await expect(page.locator("#barTitle")).toHaveText("Finanzas");
  });

  test("el engranaje abre Ajustes", async ({ page }) => {
    await page.goto("/");
    await page.click("#gear");
    await expect(page.locator("#view-ajustes")).toBeVisible();
  });

  test("escritorio: la barra lateral muestra Ajustes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await expect(page.locator('.navbtn[data-nav="ajustes"]')).toBeVisible();
  });
});
