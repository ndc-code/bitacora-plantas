import { CATEGORIA_POR_CLAVE } from './catalog-categorias-data.js';

export function categoriaDe(planta = {}) {
  const guardada = String(planta.categoria || '').trim();
  if (guardada) return guardada;

  const id = planta.planta_id || planta.id || '';
  if (id && CATEGORIA_POR_CLAVE[id]) return CATEGORIA_POR_CLAVE[id];

  const clave = `${planta.nombre || ''}::${planta.especie || ''}`;
  if (CATEGORIA_POR_CLAVE[clave]) return CATEGORIA_POR_CLAVE[clave];

  return '—';
}
