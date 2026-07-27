"use strict";

// ---------- Copia en la nube (Supabase, por fetch, sin SDK) ----------
// Guarda una copia del estado completo en la cuenta del usuario (tabla "backups"
// protegida por RLS). El acceso es por enlace mágico (sin contraseñas). El cifrado
// de extremo a extremo es opcional: si el usuario escribe una frase, los datos se
// cifran en este dispositivo y el servidor solo ve texto cifrado.

const CLOUD_KEY = "panelPersonal.cloud";

function cloudConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_URL.trim() !== "" &&
    SUPABASE_ANON_KEY.trim() !== "" &&
    !SUPABASE_URL.includes("TU-PROYECTO")
  );
}

// ----- Sesión (guardada en localStorage) -----
function cloudSession() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_KEY)) || null;
  } catch {
    return null;
  }
}
function setCloudSession(s) {
  localStorage.setItem(CLOUD_KEY, JSON.stringify(s));
}
function clearCloudSession() {
  localStorage.removeItem(CLOUD_KEY);
}

// Extrae el "sub" (id de usuario) del JWT sin verificar la firma (solo lo usamos
// como identificador de fila; la verificación real la hace el servidor).
function jwtSub(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).sub || null;
  } catch {
    return null;
  }
}

// Devuelve un access_token válido, refrescándolo si está a punto de expirar.
async function cloudToken() {
  const s = cloudSession();
  if (!s || !s.access_token) return null;
  if (Date.now() < s.expires_at - 60000) return s.access_token;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) {
      clearCloudSession();
      return null;
    }
    const j = await res.json();
    const ns = {
      access_token: j.access_token,
      refresh_token: j.refresh_token || s.refresh_token,
      expires_at: Date.now() + (j.expires_in || 3600) * 1000,
      email: s.email,
      user_id: jwtSub(j.access_token) || s.user_id,
      lastSyncAt: s.lastSyncAt,
    };
    setCloudSession(ns);
    return ns.access_token;
  } catch {
    return null;
  }
}

// ----- Cifrado opcional (WebCrypto: PBKDF2 + AES-GCM) -----
function b64(bytes) {
  const a = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}
function unb64(str) {
  const bin = atob(str);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function deriveKey(pass, salt) {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptState(plaintext, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({
    v: 1,
    enc: "aes-gcm",
    kdf: "pbkdf2",
    iter: 150000,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ct),
  });
}
async function decryptState(env, pass) {
  const key = await deriveKey(pass, unb64(env.salt));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.ct));
  return new TextDecoder().decode(pt);
}

// ----- Enlace mágico: enviar y capturar el retorno -----
async function cloudSendLink() {
  const email = ($("cloudEmail").value || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    toast("Escribe un correo válido.", { type: "warn" });
    return;
  }
  const btn = $("cloudSendLink");
  btn.disabled = true;
  try {
    const redirect = location.origin + location.pathname;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!res.ok) throw new Error(String(res.status));
    toast(`Te enviamos un enlace a ${email}. Ábrelo en este dispositivo para iniciar sesión.`, {
      type: "ok",
      duration: 9000,
    });
  } catch {
    toast("No se pudo enviar el enlace. Revisa la configuración de Supabase.", { type: "err", duration: 8000 });
  } finally {
    btn.disabled = false;
  }
}

// Al cargar la app: si volvemos del enlace mágico, el token viene en el hash de la URL.
async function handleAuthRedirect() {
  if (!cloudConfigured()) return;
  const hash = location.hash || "";
  if (hash.includes("error=")) {
    const p = new URLSearchParams(hash.slice(1));
    history.replaceState(null, "", location.pathname + location.search);
    toast("No se pudo iniciar sesión: " + (p.get("error_description") || p.get("error") || "error"), {
      type: "err",
      duration: 8000,
    });
    return;
  }
  if (!hash.includes("access_token=")) return;
  const p = new URLSearchParams(hash.slice(1));
  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");
  const expires_in = parseInt(p.get("expires_in") || "3600", 10);
  history.replaceState(null, "", location.pathname + location.search);
  if (!access_token) return;
  let email = "";
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + access_token },
    });
    if (r.ok) email = (await r.json()).email || "";
  } catch {
    /* el correo es solo informativo */
  }
  const prev = cloudSession() || {};
  setCloudSession({
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000,
    email,
    user_id: jwtSub(access_token),
    // Conserva preferencias entre reinicios de sesión (mismo usuario).
    autoSync: !!prev.autoSync,
    lastRemoteAt: prev.lastRemoteAt,
    encrypted: prev.encrypted,
  });
  toast("Sesión iniciada" + (email ? " como " + email : "") + ".", { type: "ok" });
  renderCloud();
  cloudInit();
}

function cloudSignOut() {
  clearCloudSession();
  toast("Sesión cerrada en este dispositivo.", { type: "ok" });
  renderCloud();
}

// ----- Núcleo de subir / bajar (compartido por lo manual y lo automático) -----
// Bandera para no reprogramar una sincronización mientras aplicamos una copia remota
// (evita el bucle bajar → save() → subir).
let cloudApplying = false;
// Marca cuando una copia remota está cifrada y falta la frase para sincronizar.
let cloudNeedsPass = false;

function passValue() {
  const el = $("cloudPass");
  return el ? el.value : "";
}

// Sube el estado. auto=true: sin toasts ruidosos ni bloquear botones, y NUNCA
// degrada a texto plano una copia que estaba cifrada.
async function cloudPush({ auto = false } = {}) {
  if (!cloudConfigured()) return false;
  const token = await cloudToken();
  if (!token) {
    if (!auto) {
      toast("Tu sesión expiró. Inicia sesión de nuevo.", { type: "warn" });
      renderCloud();
    }
    return false;
  }
  const s = cloudSession();
  const pass = passValue();
  if (auto && s.encrypted && !pass) {
    cloudNeedsPass = true;
    renderCloud();
    return false;
  }
  const btn = $("cloudUploadBtn");
  if (!auto && btn) btn.disabled = true;
  try {
    const data = pass ? await encryptState(JSON.stringify(state), pass) : JSON.stringify(state);
    const updatedAt = new Date().toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/backups?on_conflict=user_id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([{ user_id: s.user_id, data, updated_at: updatedAt }]),
    });
    if (!res.ok) throw new Error(String(res.status));
    s.lastSyncAt = updatedAt;
    s.lastRemoteAt = updatedAt;
    s.encrypted = !!pass;
    setCloudSession(s);
    cloudNeedsPass = false;
    if (!auto) toast(pass ? "Copia cifrada subida a la nube." : "Copia subida a la nube.", { type: "ok" });
    renderCloud();
    return true;
  } catch {
    if (!auto)
      toast("No se pudo subir la copia. Revisa tu conexión y la configuración.", { type: "err", duration: 8000 });
    return false;
  } finally {
    if (!auto && btn) btn.disabled = false;
  }
}

// Baja el estado. auto=true: sin confirmación ni toasts salvo avisos importantes,
// y solo aplica si el remoto cambió desde la última sincronización.
async function cloudPull({ auto = false } = {}) {
  if (!cloudConfigured()) return false;
  const token = await cloudToken();
  if (!token) {
    if (!auto) {
      toast("Tu sesión expiró. Inicia sesión de nuevo.", { type: "warn" });
      renderCloud();
    }
    return false;
  }
  const btn = $("cloudDownloadBtn");
  if (!auto && btn) btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/backups?select=data,updated_at`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    if (!rows || !rows.length || !rows[0].data) {
      if (!auto) toast("Todavía no hay ninguna copia en la nube.", { type: "warn" });
      return false;
    }
    const remoteAt = rows[0].updated_at;
    const sess = cloudSession();
    if (auto && sess && sess.lastRemoteAt && remoteAt === sess.lastRemoteAt) return false; // nada nuevo

    const raw = rows[0].data;
    let envelope = null;
    try {
      const maybe = JSON.parse(raw);
      if (maybe && maybe.enc === "aes-gcm") envelope = maybe;
    } catch {
      /* JSON plano */
    }

    let plaintext;
    if (envelope) {
      const pass = passValue();
      if (!pass) {
        cloudNeedsPass = true;
        renderCloud();
        if (!auto)
          toast("Esta copia está cifrada. Escribe tu frase de cifrado y vuelve a intentarlo.", {
            type: "warn",
            duration: 9000,
          });
        return false;
      }
      try {
        plaintext = await decryptState(envelope, pass);
      } catch {
        if (!auto) toast("No se pudo descifrar: frase incorrecta o datos dañados.", { type: "err", duration: 8000 });
        return false;
      }
    } else {
      plaintext = raw;
    }

    let validated, skipped;
    try {
      const parsed = JSON.parse(plaintext);
      ({ state: validated, skipped } = validateImportedState(parsed));
    } catch {
      if (!auto) toast("La copia de la nube no es válida.", { type: "err" });
      return false;
    }

    if (!auto && !confirm("Esto reemplazará los datos de ESTE dispositivo con la copia de la nube. ¿Continuar?"))
      return false;

    cloudApplying = true;
    state = validated;
    fetchedMonths.clear();
    save();
    cloudApplying = false;
    if (sess) {
      sess.lastRemoteAt = remoteAt;
      sess.lastSyncAt = remoteAt;
      sess.encrypted = !!envelope;
      setCloudSession(sess);
    }
    cloudNeedsPass = false;
    initValues();
    renderAll();
    loadWeather();
    toast(
      auto
        ? "Sincronizado desde la nube."
        : skipped
          ? `Copia descargada. Se omitieron ${skipped} elemento${skipped > 1 ? "s" : ""} no válido${skipped > 1 ? "s" : ""}.`
          : "Copia descargada de la nube.",
      { type: skipped ? "warn" : "ok" }
    );
    renderCloud();
    return true;
  } catch {
    if (!auto) toast("No se pudo descargar la copia. Revisa tu conexión.", { type: "err", duration: 8000 });
    return false;
  } finally {
    if (!auto && btn) btn.disabled = false;
  }
}

// Envoltorios de los botones manuales.
function cloudUpload() {
  return cloudPush({ auto: false });
}
function cloudDownload() {
  return cloudPull({ auto: false });
}

// ----- Sincronización automática -----
function autoSyncOn() {
  const s = cloudSession();
  return !!(s && s.access_token && s.autoSync);
}

let cloudSyncTimer = null;
// Llamado desde save() tras cada cambio: sube con un pequeño retardo (debounce).
function queueCloudSync() {
  if (cloudApplying || !autoSyncOn()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => cloudPush({ auto: true }), 2500);
}

function setAutoSync(on) {
  const s = cloudSession();
  if (!s) return;
  s.autoSync = !!on;
  setCloudSession(s);
  renderCloud();
  if (on) cloudPull({ auto: true }).then((pulled) => !pulled && cloudPush({ auto: true }));
}

// Al abrir la app estando con sesión y auto-sync: baja lo más reciente del remoto.
function cloudInit() {
  if (autoSyncOn()) cloudPull({ auto: true });
}

// ----- Render de la sección -----
function renderCloud() {
  const card = $("cloudCard");
  if (!card) return;
  if (!cloudConfigured()) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const s = cloudSession();
  const signedIn = !!(s && s.access_token);
  $("cloudSignedOut").hidden = signedIn;
  $("cloudSignedIn").hidden = !signedIn;
  if (signedIn) {
    const last = s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString() : "—";
    const auto = !!s.autoSync;
    $("cloudStatus").textContent = `Conectado como ${s.email || "(sin correo)"} · Última copia: ${last}`;
    const chk = $("cloudAuto");
    if (chk) chk.checked = auto;
    const note = $("cloudNeedsPass");
    if (note) note.hidden = !(auto && cloudNeedsPass);
  }
}

// Enganchar botones (los elementos existen siempre en el index.html).
if ($("cloudSendLink")) {
  $("cloudSendLink").addEventListener("click", cloudSendLink);
  $("cloudUploadBtn").addEventListener("click", cloudUpload);
  $("cloudDownloadBtn").addEventListener("click", cloudDownload);
  $("cloudSignOutBtn").addEventListener("click", cloudSignOut);
  $("cloudAuto").addEventListener("change", (e) => setAutoSync(e.target.checked));
  // Si escribe la frase, reintenta la sincronización pendiente por falta de clave.
  $("cloudPass").addEventListener("input", () => {
    if (cloudNeedsPass && passValue() && autoSyncOn()) cloudPull({ auto: true });
  });
}
