"use strict";
const { test, expect } = require("@playwright/test");

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
const TOKEN = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "user-test" })}.sig`;
const LOGIN_URL = `/?login=1#access_token=${TOKEN}&refresh_token=r1&expires_in=3600&token_type=bearer&type=magiclink`;

test.describe("Copia en la nube", () => {
  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.accept()); // el "Bajar de la nube" pide confirmación
    await page.goto("/");
    await page.evaluate(() => fetch("/__reset"));
  });

  test("cifrado: round-trip encrypt/decrypt en el navegador", async ({ page }) => {
    const ok = await page.evaluate(async () => {
      const env = await encryptState(JSON.stringify({ hola: "mundo" }), "clave");
      const back = await decryptState(JSON.parse(env), "clave");
      return back === JSON.stringify({ hola: "mundo" });
    });
    expect(ok).toBe(true);
  });

  test("login por enlace mágico guarda la sesión", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect
      .poll(() => page.evaluate(() => !!(JSON.parse(localStorage.getItem("panelPersonal.cloud")) || {}).access_token))
      .toBe(true);
    const sess = await page.evaluate(() => JSON.parse(localStorage.getItem("panelPersonal.cloud")));
    expect(sess.user_id).toBe("user-test");
    expect(sess.email).toBe("test@example.com");
  });

  test("subir y bajar restaura el estado (sin cifrar)", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.evaluate(() => {
      state.expenses.push({ id: "e1", amount: 7, cat: "Otros", note: "nube", date: todayStr });
      save();
      renderAll();
    });
    await page.evaluate(() => cloudUpload());
    const restored = await page.evaluate(async () => {
      state = defaultState();
      save();
      renderAll();
      await cloudDownload();
      return { n: state.expenses.length, note: state.expenses[0] && state.expenses[0].note };
    });
    expect(restored.n).toBe(1);
    expect(restored.note).toBe("nube");
  });

  test("cifrado E2E: el servidor solo guarda texto cifrado y se recupera con la frase", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.evaluate(async () => {
      state.expenses.push({ id: "e2", amount: 3, cat: "Otros", note: "secreto", date: todayStr });
      save();
      $("cloudPass").value = "mi-frase";
      await cloudUpload();
    });
    const stored = await page.evaluate(
      async () => (await (await fetch("/rest/v1/backups?select=data")).json())[0].data
    );
    const env = JSON.parse(stored);
    expect(env.enc).toBe("aes-gcm");
    expect(stored).not.toContain("secreto");

    const restored = await page.evaluate(async () => {
      state = defaultState();
      save();
      $("cloudPass").value = "mi-frase";
      await cloudDownload();
      return state.expenses[0] && state.expenses[0].note;
    });
    expect(restored).toBe("secreto");
  });

  test("cifrado E2E: con frase incorrecta no restaura", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.evaluate(async () => {
      state.expenses.push({ id: "e3", amount: 3, cat: "Otros", note: "top", date: todayStr });
      save();
      $("cloudPass").value = "correcta";
      await cloudUpload();
    });
    const n = await page.evaluate(async () => {
      state = defaultState();
      save();
      $("cloudPass").value = "incorrecta";
      await cloudDownload();
      return state.expenses.length;
    });
    expect(n).toBe(0);
  });
});
