import { qs, qsa } from './dom.js';

export const ESTACIONES = ['verano', 'invierno', 'primavera', 'otoño'];
const STORAGE_KEY = 'bitacora-riego-estacion';

export function estacionActual() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (ESTACIONES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }

  // Hemisferio sur (ARG)
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return 'verano';
  if (month <= 4) return 'otoño';
  if (month <= 7) return 'invierno';
  return 'primavera';
}

function guardarEstacion(estacion) {
  try {
    localStorage.setItem(STORAGE_KEY, estacion);
  } catch {
    /* ignore */
  }
}

function parseRiegos(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function riegoParaEstacion(riegos, fallback, estacion) {
  if (riegos && typeof riegos[estacion] === 'string') return riegos[estacion];
  return fallback || '—';
}

// Por clase y no por `id`: el header de columnas se repite en cada categoría,
// así que hay un toggle de estación por categoría y todos se sincronizan acá.
const SELECTOR_TOGGLE = '.catalog-riego-toggle, .coleccion-riego-btn';

function togglesEnPagina() {
  return qsa(SELECTOR_TOGGLE);
}

function applyEstacion(root, estacion) {
  togglesEnPagina().forEach((toggle) => {
    toggle.dataset.estacion = estacion;
    toggle.setAttribute(
      'aria-label',
      `Riego en ${estacion}. Clic para cambiar estación`
    );
  });

  qsa('.riego-estacion-label, .coleccion-card-estacion').forEach((label) => {
    label.textContent = `(${estacion})`;
  });

  if (!root) return;

  qsa('.catalog-entry', root).forEach((entry) => {
    const riegos = parseRiegos(entry.dataset.riegos);
    const value = riegoParaEstacion(riegos, entry.dataset.riego, estacion);
    entry.dataset.riego = value;

    qsa('.catalog-riego', entry).forEach((cell) => {
      cell.textContent = value;
    });

    qsa('.catalog-add', entry).forEach((btn) => {
      btn.dataset.riego = value;
    });
  });
}

export function wireRiegoEstacion(root, { onChange } = {}) {
  if (!root) return;

  const initial = estacionActual();
  applyEstacion(root, initial);
  onChange?.(initial);

  root.addEventListener('click', (event) => {
    const toggle = event.target.closest(SELECTOR_TOGGLE);
    if (!toggle) return;

    event.preventDefault();
    event.stopPropagation();

    const current = toggle.dataset.estacion || estacionActual();
    const index = ESTACIONES.indexOf(current);
    const next = ESTACIONES[(index + 1) % ESTACIONES.length];
    guardarEstacion(next);
    applyEstacion(root, next);
    onChange?.(next);
  });

  // Antes había un listener aparte para el toggle del header, que vivía fuera de
  // #catalog-rows. Ahora el header se genera dentro de cada categoría, o sea
  // dentro de `root`, y lo cubre el listener delegado de arriba.
}

export function refreshRiegoEstacion(root) {
  applyEstacion(root, estacionActual());
}
