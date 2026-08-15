import { qs, qsa } from './dom.js';
import { wireCatalogGallery3D } from './catalog-gallery-3d.js';

const STORAGE_KEY = 'bitacora-catalog-view';

function setActiveButtons(switcher, view) {
  qsa('.catalog-view-btn', switcher).forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function applyView(page, view, gallery3d) {
  page.dataset.view = view;

  if (view === '3') {
    gallery3d.activar();
  } else {
    gallery3d.desactivar();
  }
}

export function wireCatalogView({ onGallery3DSeleccion } = {}) {
  const page = qs('.catalog-page');
  const switcher = qs('.catalog-view-switch');
  if (!page || !switcher) return;

  const gallery3d = wireCatalogGallery3D({ onSeleccion: onGallery3DSeleccion });

  let initial = '1';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1' || saved === '2' || saved === '3') initial = saved;
  } catch {
    /* ignore */
  }

  applyView(page, initial, gallery3d);
  setActiveButtons(switcher, initial);

  switcher.addEventListener('click', (event) => {
    const btn = event.target.closest('.catalog-view-btn');
    if (!btn || !switcher.contains(btn)) return;
    const view = btn.dataset.view;
    if (!view) return;
    applyView(page, view, gallery3d);
    setActiveButtons(switcher, view);
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  });
}
