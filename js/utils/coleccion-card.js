import { escapeHtml } from './dom.js';
import { estacionActual, riegoParaEstacion } from './catalog-riego-estacion.js';
import { categoriaDe } from './catalog-categorias.js';

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

function bitacoraCell(planta) {
  if (!planta.id) return '<span>—</span>';
  const nombre = escapeHtml(planta.nombre);
  const id = escapeHtml(planta.id);
  return `<a class="coleccion-bitacora-link" href="bitacora.html?id=${id}" aria-label="Ver bitácora de ${nombre}">Ver</a>`;
}

export function entryMarkup(planta) {
  const galeria = Array.isArray(planta.galeria) ? planta.galeria : [];
  const riegos = riegosDePlanta(planta);
  const riego = riegoParaEstacion(riegos, planta.riego, estacionActual());
  const imagen = planta.imagen || galeria[0] || '';
  const estacion = estacionActual();
  const categoria = categoriaDe(planta);

  return `
    <article class="coleccion-card">
      <div class="coleccion-card-info">
        <ul class="coleccion-card-facts">
          <li><span>Nombre</span><h2>${escapeHtml(planta.nombre)}</h2></li>
          <li><span>Categoría</span><span>${escapeHtml(categoria)}</span></li>
          <li><span>Especie</span><span>${escapeHtml(planta.especie || '—')}</span></li>
          <li><span>Ubicación</span><span>${escapeHtml(planta.ubicacion || '—')}</span></li>
          <li><span>Luz</span><span>${escapeHtml(planta.luz || '—')}</span></li>
          <li>
            <button type="button" class="coleccion-riego-btn" data-estacion="${escapeHtml(estacion)}" aria-label="Riego en ${escapeHtml(estacion)}. Clic para cambiar estación">
              Riego <span class="coleccion-card-estacion">(${escapeHtml(estacion)})</span>
            </button>
            <span class="catalog-riego">${escapeHtml(riego)}</span>
          </li>
          <li><span>Suelo</span><span>${escapeHtml(planta.suelo || '—')}</span></li>
          <li><span>Cuidado</span><span>${escapeHtml(planta.cuidado || '—')}</span></li>
          <li><span>Bitácora</span>${bitacoraCell(planta)}</li>
          <li>
            <span>Colección</span>
            <button
              type="button"
              class="coleccion-eliminar-btn"
              data-id="${escapeHtml(idDeColeccion(planta))}"
              title="Eliminar de Colección"
              aria-label="Eliminar de Colección"
            >Eliminar</button>
          </li>
        </ul>
      </div>
      <figure class="coleccion-card-media">
        ${
          imagen
            ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(planta.nombre)}" loading="lazy" width="900" height="700" />`
            : ''
        }
      </figure>
    </article>
  `;
}
