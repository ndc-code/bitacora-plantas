import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diasDeRiego, textoProximoRiego, formatFechaCorta } from './riego-frecuencia.js';

test('diasDeRiego parsea "Cada N días"', () => {
  assert.equal(diasDeRiego('Cada 10 días'), 10);
  assert.equal(diasDeRiego('Cada 1 días'), 1);
  assert.equal(diasDeRiego('cada 7 días'), 7);
});

test('diasDeRiego devuelve null si el texto no sirve', () => {
  assert.equal(diasDeRiego(''), null);
  assert.equal(diasDeRiego('—'), null);
  assert.equal(diasDeRiego('cuando seque'), null);
  assert.equal(diasDeRiego(null), null);
});

test('textoProximoRiego formatea En / Hoy / Hace en días de calendario local', () => {
  const ahora = new Date(2026, 7, 14);
  assert.equal(textoProximoRiego(new Date(2026, 7, 17), ahora), 'En 3 días');
  assert.equal(textoProximoRiego(new Date(2026, 7, 15), ahora), 'En 1 día');
  assert.equal(textoProximoRiego(new Date(2026, 7, 14), ahora), 'Hoy');
  assert.equal(textoProximoRiego(new Date(2026, 7, 12), ahora), 'Hace 2 días');
  assert.equal(textoProximoRiego(new Date(2026, 7, 13), ahora), 'Hace 1 día');
});

test('textoProximoRiego devuelve null si no hay fecha o frecuencia', () => {
  assert.equal(textoProximoRiego(null), null);
});

test('formatFechaCorta usa calendario local y no UTC', () => {
  assert.equal(formatFechaCorta('2026-08-12'), '12 ago 2026');
  assert.equal(formatFechaCorta(new Date(2026, 7, 12)), '12 ago 2026');
});
