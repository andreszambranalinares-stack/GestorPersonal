"use strict";
const { test, expect } = require("@playwright/test");

test.describe("Bloqueo con PIN", () => {
  test("set/verify/clear del PIN (hasheado, no en claro)", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(async () => {
      await setPin("1234");
      const rec = JSON.parse(localStorage.getItem("panelPersonal.pin"));
      return {
        ok: await verifyPin("1234"),
        bad: await verifyPin("0000"),
        plain: JSON.stringify(rec).includes("1234"),
        configured: pinConfigured(),
      };
    });
    expect(r.ok).toBe(true);
    expect(r.bad).toBe(false);
    expect(r.plain).toBe(false); // el PIN no se guarda en claro
    expect(r.configured).toBe(true);
    await page.evaluate(() => clearPin());
    expect(await page.evaluate(() => pinConfigured())).toBe(false);
  });

  test("la pantalla de bloqueo se abre con PIN y desbloquea con el correcto", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await setPin("4321");
      showLock();
    });
    await expect(page.locator("#lockScreen")).toBeVisible();
    await page.fill("#lockInput", "0000");
    await page.click("#lockEnter");
    await expect(page.locator("#lockMsg")).toHaveText("PIN incorrecto.");
    await expect(page.locator("#lockScreen")).toBeVisible();
    await page.fill("#lockInput", "4321");
    await page.click("#lockEnter");
    await expect(page.locator("#lockScreen")).toBeHidden();
  });
});
