import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatearFechaHora, msHastaProximoMinuto } from './reloj.js';

test('formatearFechaHora arma "13 ago 23:46" sin la coma que mete Intl', () => {
  const d = new Date('2026-08-14T02:46:00.000Z'); // 23:46 en Buenos Aires
  assert.equal(formatearFechaHora(d), '13 ago 23:46');
});

test('formatearFechaHora usa el huso de Buenos Aires, no el del sistema', () => {
  // 01:30 UTC del 14 todavía es el 13 a las 22:30 en Buenos Aires (UTC-3).
  const d = new Date('2026-08-14T01:30:00.000Z');
  assert.equal(formatearFechaHora(d), '13 ago 22:30');
});

test('formatearFechaHora usa reloj de 24 horas', () => {
  const d = new Date('2026-08-13T18:05:00.000Z'); // 15:05 en Buenos Aires
  assert.equal(formatearFechaHora(d), '13 ago 15:05');
});

test('msHastaProximoMinuto descuenta segundos y milisegundos', () => {
  const d = new Date('2026-08-13T15:30:20.250Z');
  assert.equal(msHastaProximoMinuto(d), 39750);
});

test('msHastaProximoMinuto devuelve un minuto entero justo en el minuto redondo', () => {
  const d = new Date('2026-08-13T15:30:00.000Z');
  assert.equal(msHastaProximoMinuto(d), 60000);
});
