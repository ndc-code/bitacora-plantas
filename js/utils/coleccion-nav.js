import { qs } from './dom.js';
import { contarColeccion } from '../services/coleccion.js';

export async function syncColeccionNavCount() {
  const countEl = qs('#coleccion-count');
  const sidebarCountEl = qs('#sidebar-coleccion-count');
  if (!countEl && !sidebarCountEl) return;
  const count = await contarColeccion();
  if (countEl) countEl.textContent = `(${count})`;
  if (sidebarCountEl) sidebarCountEl.textContent = `(${count})`;
}
