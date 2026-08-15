import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaDe } from './catalog-categorias.js';

test('categoriaDe resuelve Plantas de interior por nombre y especie', () => {
  assert.equal(
    categoriaDe({ nombre: 'Aglaonema', especie: 'Aglaonema commutatum' }),
    'Plantas de interior'
  );
});

test('categoriaDe distingue homónimos por especie', () => {
  assert.equal(
    categoriaDe({ nombre: 'Anémona', especie: 'Anemone x hybrida' }),
    'Herbáceas perennes'
  );
  assert.equal(
    categoriaDe({ nombre: 'Anémona', especie: 'Anemone coronaria' }),
    'Bulbosas'
  );
});

test('categoriaDe resuelve por planta_id cuando hay id de catálogo', () => {
  assert.equal(
    categoriaDe({ planta_id: 'rafis::arecaceas::interior' }),
    'Plantas de interior'
  );
});

test('categoriaDe usa la categoría ya guardada si viene en la planta', () => {
  assert.equal(
    categoriaDe({ nombre: 'X', categoria: 'Arbustos' }),
    'Arbustos'
  );
});

test('categoriaDe devuelve raya si no hay match', () => {
  assert.equal(categoriaDe({ nombre: 'Planta inventada', especie: 'Nada' }), '—');
});
