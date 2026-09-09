import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  etiquetaParaTema,
  momentoActual,
  TEMA_DIA,
  TEMA_NOCHE,
} from './theme.js';

test('etiquetaParaTema nombra el estado actual: Día', () => {
  assert.equal(etiquetaParaTema(TEMA_DIA), 'Día');
});

test('etiquetaParaTema nombra el estado actual: Noche', () => {
  assert.equal(etiquetaParaTema(TEMA_NOCHE), 'Noche');
});

test('momentoActual: Día de 06:00 a 17:59 (Buenos Aires)', () => {
  assert.equal(momentoActual(new Date('2026-09-08T09:00:00.000Z')), TEMA_DIA); // 06:00 AR
  assert.equal(momentoActual(new Date('2026-09-08T12:00:00.000Z')), TEMA_DIA); // 09:00 AR
  assert.equal(momentoActual(new Date('2026-09-08T20:59:00.000Z')), TEMA_DIA); // 17:59 AR
});

test('momentoActual: Noche de 18:00 a 05:59 (Buenos Aires)', () => {
  assert.equal(momentoActual(new Date('2026-09-08T21:00:00.000Z')), TEMA_NOCHE); // 18:00 AR
  assert.equal(momentoActual(new Date('2026-09-08T22:22:00.000Z')), TEMA_NOCHE); // 19:22 AR
  assert.equal(momentoActual(new Date('2026-09-09T03:00:00.000Z')), TEMA_NOCHE); // 00:00 AR
  assert.equal(momentoActual(new Date('2026-09-09T08:59:00.000Z')), TEMA_NOCHE); // 05:59 AR
});

test('momentoActual resuelve por el huso de Buenos Aires, no el del sistema', () => {
  assert.equal(momentoActual(new Date('2026-09-08T12:30:00.000Z')), TEMA_DIA); // 09:30 AR
});
