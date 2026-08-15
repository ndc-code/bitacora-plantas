import { qs, qsa } from './dom.js';

const FILTER_KEYS = ['ubicacion', 'luz', 'suelo', 'cuidado', 'riego'];

function selectedValues(form, name) {
  return qsa(`input[name="${name}"]:checked`, form).map((input) => input.value);
}

function matchesFilters(entry, filters) {
  return FILTER_KEYS.every((key) => {
    const selected = filters[key];
    if (!selected.length) return true;
    return selected.includes(entry.dataset[key]);
  });
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function matchesSearch(entry, query) {
  if (!query) return true;
  const btn = entry.querySelector('.catalog-add');
  const haystack = normalizeSearch(
    [
      btn?.dataset.nombre || entry.dataset.nombre,
      btn?.dataset.especie || entry.dataset.especie,
    ]
      .filter(Boolean)
      .join(' ')
  );
  return haystack.includes(query);
}

function applyFilters(form, root, searchInput) {
  const filters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, selectedValues(form, key)])
  );
  const query = normalizeSearch(searchInput?.value);

  qsa('.catalog-entry', root).forEach((entry) => {
    const visible = matchesFilters(entry, filters) && matchesSearch(entry, query);
    entry.classList.toggle('is-filtered-out', !visible);
    if (!visible && entry.classList.contains('is-open')) {
      entry.classList.remove('is-open');
      entry.querySelector('.catalog-row')?.setAttribute('aria-expanded', 'false');
      const panel = entry.querySelector('.catalog-accordion');
      if (panel) panel.hidden = true;
    }
  });

  // Una categoría cuyas plantas quedaron todas filtradas no debe dejar colgados
  // el nombre, la línea y los títulos de columna sin nada debajo.
  qsa('.catalog-group', root).forEach((group) => {
    const visibles = qsa('.catalog-entry:not(.is-filtered-out)', group).length;
    group.classList.toggle('is-empty', visibles === 0);

    // El contador sigue a los filtros: dejarlo en el total mostraría "(26)" con
    // una sola planta a la vista.
    const contador = qs('.catalog-category-count', group);
    if (contador) contador.textContent = `(${visibles})`;
  });
}

function enforceSingleOption(form, input) {
  if (!input?.checked || !input.name) return;
  qsa(`input[name="${input.name}"]`, form).forEach((other) => {
    if (other !== input) other.checked = false;
  });
}

export function wireCatalogFilters(root) {
  const form = qs('#catalog-filters');
  const searchInput = qs('#catalog-search');
  if (!form || !root) return;

  const refresh = () => applyFilters(form, root, searchInput);
  form.addEventListener('change', (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (input && form.contains(input)) {
      enforceSingleOption(form, input);
    }
    refresh();
  });
  searchInput?.addEventListener('input', refresh);
  refresh();
}

export function wireFiltersToggle() {
  const section = qs('.catalog-filters');
  const toggle = qs('#catalog-filters-toggle');
  const panel = qs('#catalog-filters');
  if (!section || !toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    const nextOpen = !open;
    toggle.setAttribute('aria-expanded', String(nextOpen));
    section.classList.toggle('is-collapsed', !nextOpen);
    section.hidden = !nextOpen;
    panel.hidden = !nextOpen;
  });
}

export function refreshCatalogFilters(root) {
  const form = qs('#catalog-filters');
  const searchInput = qs('#catalog-search');
  if (!form || !root) return;
  applyFilters(form, root, searchInput);
}
