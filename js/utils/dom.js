export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

export function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

// Mensaje de confirmación (no es un error): mismo mecanismo, otra clase CSS.
export function showStatus(el, message) {
  el.textContent = message;
  el.hidden = false;
}

export function clearStatus(el) {
  el.textContent = '';
  el.hidden = true;
}

const ESCAPES_HTML = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto ingresado por la persona usuaria antes de interpolarlo en un
 * template literal que termina en `innerHTML`.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (char) => ESCAPES_HTML[char]);
}
