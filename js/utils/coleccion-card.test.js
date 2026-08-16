import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryMarkup } from './coleccion-card.js';

function plantaCard(extra = {}) {
  return {
    nombre: 'Aglaonema',
    especie: 'Aglaonema commutatum',
    ubicacion: 'Sombra',
    luz: 'Baja',
    suelo: 'Franco',
    cuidado: 'Fácil',
    riego: 'Cada 10 días',
    ...extra,
  };
}

test('la fila muestra el nombre de la planta como link', () => {
  const html = entryMarkup(plantaCard());
  assert.match(html, /class="coleccion-row-link"/);
  assert.match(html, /class="coleccion-row-text">Aglaonema</);
});

test('el link de la fila apunta a la bitácora de la planta por uuid', () => {
  const html = entryMarkup(
    plantaCard({ id: '11111111-1111-4111-8111-111111111111' })
  );
  assert.match(html, /href="bitacora.html\?id=11111111-1111-4111-8111-111111111111"/);
});

test('sin id de fila, el link de bitácora queda vacío pero no rompe', () => {
  const html = entryMarkup(plantaCard());
  assert.match(html, /href="bitacora.html\?id="/);
});

test('la fila expone la imagen de la planta para el preview fijo', () => {
  const html = entryMarkup(plantaCard({ imagen: 'assets/aglaonema.jpg' }));
  assert.match(html, /data-imagen="assets\/aglaonema.jpg"/);
});

test('sin imagen propia, usa la primera de la galería para el preview', () => {
  const html = entryMarkup(
    plantaCard({ galeria: ['assets/galeria-1.jpg', 'assets/galeria-2.jpg'] })
  );
  assert.match(html, /data-imagen="assets\/galeria-1.jpg"/);
});

test('Eliminar sigue usando planta_id y no el uuid de Bitácora', () => {
  const html = entryMarkup(
    plantaCard({
      id: '11111111-1111-4111-8111-111111111111',
      planta_id: 'aglaonema::aglaonema commutatum::sombra',
    })
  );
  assert.match(html, /data-id="aglaonema::aglaonema commutatum::sombra"/);
  assert.match(html, /href="bitacora.html\?id=11111111-1111-4111-8111-111111111111"/);
});
