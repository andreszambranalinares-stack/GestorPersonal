"use strict";

// ---------- Bloqueo con PIN (pantalla de privacidad, local a este dispositivo) ----------
// Nota: es una barrera de privacidad, no cifrado. Los datos siguen en localStorage;
// para protección fuerte, usa el cifrado de extremo a extremo de la copia en la nube.
// El PIN se guarda hasheado (SHA-256 con sal) y NO se sincroniza ni se exporta.

const PIN_KEY = "panelPersonal.pin";

function pinRecord() {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY)) || null;
  } catch {
    return null;
  }
}
function pinConfigured() {
  const r = pinRecord();
  return !!(r && r.hash && r.salt);
}
async function hashPin(pin, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function setPin(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
}
async function verifyPin(pin) {
  const r = pinRecord();
  if (!r) return false;
  return (await hashPin(pin, r.salt)) === r.hash;
}
function clearPin() {
  localStorage.removeItem(PIN_KEY);
}

// ----- Pantalla de bloqueo -----
function showLock() {
  const el = $("lockScreen");
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = "hidden";
  const inp = $("lockInput");
  if (inp) {
    inp.value = "";
    setTimeout(() => inp.focus(), 50);
  }
  $("lockMsg").textContent = "";
}
function hideLock() {
  const el = $("lockScreen");
  if (!el) return;
  el.hidden = true;
  document.body.style.overflow = "";
}
async function tryUnlock() {
  const inp = $("lockInput");
  if (!inp) return;
  if (await verifyPin(inp.value)) {
    hideLock();
  } else {
    $("lockMsg").textContent = "PIN incorrecto.";
    inp.value = "";
    inp.focus();
  }
}

// ----- Ajustes -----
function renderLock() {
  const status = $("lockStatus");
  if (!status) return;
  const on = pinConfigured();
  status.textContent = on ? "PIN activado ✓" : "Sin PIN: la app se abre directamente.";
  $("pinSetBtn").textContent = on ? "Cambiar PIN" : "Establecer PIN";
  $("pinClearBtn").hidden = !on;
  $("pinLockNow").hidden = !on;
}

function askPin(msg) {
  const v = prompt(msg);
  if (v == null) return null;
  const pin = v.trim();
  if (!/^\d{4,12}$/.test(pin)) {
    toast("El PIN debe tener entre 4 y 12 dígitos.", { type: "warn" });
    return null;
  }
  return pin;
}

if ($("lockEnter")) {
  $("lockEnter").addEventListener("click", tryUnlock);
  $("lockInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });
  $("pinSetBtn").addEventListener("click", async () => {
    if (pinConfigured()) {
      const old = askPin("Introduce tu PIN actual:");
      if (old == null) return;
      if (!(await verifyPin(old))) {
        toast("PIN actual incorrecto.", { type: "err" });
        return;
      }
    }
    const pin = askPin("Nuevo PIN (4-12 dígitos):");
    if (pin == null) return;
    const rep = askPin("Repite el PIN:");
    if (rep == null) return;
    if (pin !== rep) {
      toast("Los PIN no coinciden.", { type: "err" });
      return;
    }
    await setPin(pin);
    renderLock();
    toast("PIN activado.", { type: "ok" });
  });
  $("pinClearBtn").addEventListener("click", async () => {
    const old = askPin("Introduce tu PIN para quitarlo:");
    if (old == null) return;
    if (!(await verifyPin(old))) {
      toast("PIN incorrecto.", { type: "err" });
      return;
    }
    clearPin();
    renderLock();
    toast("PIN eliminado.", { type: "ok" });
  });
  $("pinLockNow").addEventListener("click", showLock);
}

// Al cargar, si hay PIN, bloquea.
if (pinConfigured()) showLock();
