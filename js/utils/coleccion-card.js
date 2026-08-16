import { escapeHtml } from './dom.js';

export function riegosDePlanta(planta) {
  if (planta.riegos && typeof planta.riegos === 'object') return planta.riegos;
  const fallback = planta.riego || '';
  return {
    verano: fallback,
    invierno: fallback,
    primavera: fallback,
    otoño: fallback,
  };
}

export function idDeColeccion(planta) {
  return planta.planta_id || planta.id || '';
}

export function entryMarkup(planta) {
  const galeria = Array.isArray(planta.galeria) ? planta.galeria : [];
  const imagen = planta.imagen || galeria[0] || '';
  const nombre = escapeHtml(planta.nombre);
  const id = escapeHtml(planta.id || '');

  return `
    <div class="coleccion-row">
      <a class="coleccion-row-link" href="bitacora.html?id=${id}" data-imagen="${escapeHtml(imagen)}">
        <span class="coleccion-row-title">
          <span class="coleccion-row-text">${nombre}</span>
          <button
            type="button"
            class="coleccion-eliminar-btn"
            data-id="${escapeHtml(idDeColeccion(planta))}"
            title="Eliminar de Colección"
            aria-label="Eliminar ${nombre} de Colección"
          >Eliminar</button>
        </span>
      </a>
    </div>
  `;
}
