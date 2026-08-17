import { test } from 'node:test';
import assert from 'node:assert/strict';
import { temaOpuesto, etiquetaParaTema, TEMA_CLARO, TEMA_OSCURO } from './theme.js';

test('temaOpuesto de claro es oscuro', () => {
  assert.equal(temaOpuesto(TEMA_CLARO), TEMA_OSCURO);
});

test('temaOpuesto de oscuro es claro', () => {
  assert.equal(temaOpuesto(TEMA_OSCURO), TEMA_CLARO);
});

test('etiquetaParaTema invita a pasar a Noche estando en claro', () => {
  assert.equal(etiquetaParaTema(TEMA_CLARO), 'Noche');
});

test('etiquetaParaTema invita a pasar a Día estando en oscuro', () => {
  assert.equal(etiquetaParaTema(TEMA_OSCURO), 'Día');
});
