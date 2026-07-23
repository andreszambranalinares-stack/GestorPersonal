"use strict";

// ---------- Toasts ----------
function toast(msg, opts = {}) {
  const { type = "info", duration = 4000, actionLabel, onAction } = opts;
  const host = $("toastHost");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const span = document.createElement("span");
  span.className = "tmsg";
  span.textContent = msg;
  el.appendChild(span);
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.remove();
  };
  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      onAction();
      dismiss();
    });
    el.appendChild(btn);
  }
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "tclose";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Cerrar");
  closeBtn.addEventListener("click", dismiss);
  el.appendChild(closeBtn);
  host.appendChild(el);
  if (duration > 0) timer = setTimeout(dismiss, duration);
  return dismiss;
}
