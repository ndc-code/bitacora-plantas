import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularProximoVencimiento, calcularEstadoPlanta } from './recordatorios.js';

test('calcularProximoVencimiento usa la última fecha registrada si existe', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: '2026-08-01T00:00:00.000Z',
    fechaAlta: '2026-01-01T00:00:00.000Z',
    frecuenciaDias: 5,
  });
  assert.equal(resultado.toISOString(), new Date('2026-08-06T00:00:00.000Z').toISOString());
});

test('calcularProximoVencimiento usa fechaAlta si nunca se registró ese cuidado', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: null,
    fechaAlta: '2026-08-01T00:00:00.000Z',
    frecuenciaDias: 5,
  });
  assert.equal(resultado.toISOString(), new Date('2026-08-06T00:00:00.000Z').toISOString());
});

test('calcularProximoVencimiento devuelve null si no hay frecuencia configurada', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: '2026-08-01T00:00:00.000Z',
    fechaAlta: '2026-01-01T00:00:00.000Z',
    frecuenciaDias: null,
  });
  assert.equal(resultado, null);
});

test('calcularEstadoPlanta devuelve sin_registrar si no hay vencimientos', () => {
  assert.equal(calcularEstadoPlanta([]), 'sin_registrar');
  assert.equal(calcularEstadoPlanta([null, null]), 'sin_registrar');
});

test('calcularEstadoPlanta devuelve vencido si el más próximo ya pasó', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-05T00:00:00.000Z'), new Date('2026-09-01T00:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'vencido');
});

test('calcularEstadoPlanta devuelve proximo si vence dentro de 2 días', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-10T12:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'proximo');
});

test('calcularEstadoPlanta devuelve al_dia si vence en más de 2 días', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-20T00:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'al_dia');
});
