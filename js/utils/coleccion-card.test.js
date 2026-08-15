import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryMarkup } from './coleccion-card.js';

function lis(html) {
  return [...html.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((m) => m[0].replace(/\s+/g, ' '));
}

test('la card pone Nombre primero, con el nombre de la planta, como las demás filas', () => {
  const html = entryMarkup({
    nombre: 'Aglaonema',
    especie: 'Aglaonema commutatum',
    ubicacion: 'Sombra',
    luz: 'Baja',
    suelo: 'Franco',
    cuidado: 'Fácil',
    riego: 'Cada 10 días',
  });
  const filas = lis(html);

  assert.match(filas[0], /<span>Nombre<\/span>/);
  assert.match(filas[0], /Aglaonema/);
  assert.doesNotMatch(html, /coleccion-card-title/);
});

test('debajo de Nombre va Categoría con la del catálogo', () => {
  const html = entryMarkup({
    nombre: 'Aglaonema',
    especie: 'Aglaonema commutatum',
    ubicacion: 'Sombra',
    luz: 'Baja',
    suelo: 'Franco',
    cuidado: 'Fácil',
    riego: 'Cada 10 días',
  });
  const filas = lis(html);

  assert.match(filas[1], /<span>Categoría<\/span>/);
  assert.match(filas[1], /Plantas de interior/);
});

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

test('encima de Eliminar va Bitácora con link al uuid de la fila', () => {
  const html = entryMarkup(plantaCard({ id: '11111111-1111-4111-8111-111111111111' }));
  const filas = lis(html);
  const iBitacora = filas.findIndex((li) => /<span>Bitácora<\/span>/.test(li));
  const iEliminar = filas.findIndex((li) => /coleccion-eliminar-btn/.test(li));

  assert.ok(iBitacora >= 0);
  assert.ok(iEliminar >= 0);
  assert.equal(iBitacora, iEliminar - 1);
  assert.match(
    filas[iBitacora],
    /href="bitacora.html\?id=11111111-1111-4111-8111-111111111111"/
  );
  assert.match(filas[iBitacora], /class="coleccion-bitacora-link"/);
  assert.match(filas[iBitacora], /aria-label="Ver bitácora de Aglaonema"/);
  assert.match(filas[iBitacora], />Ver</);
});

test('sin id de fila, Bitácora no arma link', () => {
  const html = entryMarkup(plantaCard());
  assert.match(html, /<span>Bitácora<\/span>/);
  assert.doesNotMatch(html, /coleccion-bitacora-link/);
  assert.doesNotMatch(html, /bitacora.html/);
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
