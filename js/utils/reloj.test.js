import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearFechaEstacion,
  formatearHoraCompleta,
  estacionActualTema,
  msHastaProximoMinuto,
} from './reloj.js';

test('formatearFechaEstacion arma "13 ago Invierno" sin la coma que mete Intl', () => {
  const d = new Date('2026-08-14T02:46:00.000Z'); // 23:46 del 13 en Buenos Aires
  assert.equal(formatearFechaEstacion(d), '13 ago Invierno');
});

test('formatearFechaEstacion usa el huso de Buenos Aires, no el del sistema', () => {
  const d = new Date('2026-08-14T01:30:00.000Z'); // 22:30 del 13 AR
  assert.equal(formatearFechaEstacion(d), '13 ago Invierno');
});

test('formatearFechaEstacion usa las estaciones del hemisferio sur', () => {
  assert.equal(formatearFechaEstacion(new Date('2026-01-13T15:00:00.000Z')), '13 ene Verano');
  assert.equal(formatearFechaEstacion(new Date('2026-04-13T15:00:00.000Z')), '13 abr Otoño');
  assert.equal(formatearFechaEstacion(new Date('2026-07-13T15:00:00.000Z')), '13 jul Invierno');
  assert.equal(formatearFechaEstacion(new Date('2026-10-13T15:00:00.000Z')), '13 oct Primavera');
  assert.equal(formatearFechaEstacion(new Date('2026-12-13T15:00:00.000Z')), '13 dic Verano');
});

test('formatearHoraCompleta arma "19:18 AR 08 SEP 2026": mes abreviado en mayúscula y "AR"', () => {
  const d = new Date('2026-09-08T22:18:00.000Z'); // 19:18 del 8 en Buenos Aires
  assert.equal(formatearHoraCompleta(d), '19:18 AR 08 SEP 2026');
});

test('formatearHoraCompleta abrevia el mes a 3 letras sin punto en todos los meses', () => {
  const meses = [
    ['2026-01-15T15:00:00.000Z', '12:00 AR 15 ENE 2026'],
    ['2026-09-15T15:00:00.000Z', '12:00 AR 15 SEP 2026'],
    ['2026-12-15T15:00:00.000Z', '12:00 AR 15 DIC 2026'],
  ];
  for (const [iso, esperado] of meses) {
    assert.equal(formatearHoraCompleta(new Date(iso)), esperado);
  }
});

test('formatearHoraCompleta usa el huso de Buenos Aires, no el del sistema', () => {
  const d = new Date('2026-09-09T02:30:00.000Z'); // 23:30 del 8 AR
  assert.equal(formatearHoraCompleta(d), '23:30 AR 08 SEP 2026');
});

test('estacionActualTema devuelve la estación por mes calendario (hemisferio sur)', () => {
  assert.equal(estacionActualTema(new Date('2026-01-13T15:00:00.000Z')), 'Verano');
  assert.equal(estacionActualTema(new Date('2026-04-13T15:00:00.000Z')), 'Otoño');
  assert.equal(estacionActualTema(new Date('2026-07-13T15:00:00.000Z')), 'Invierno');
  assert.equal(estacionActualTema(new Date('2026-09-13T15:00:00.000Z')), 'Invierno');
  assert.equal(estacionActualTema(new Date('2026-10-13T15:00:00.000Z')), 'Primavera');
  assert.equal(estacionActualTema(new Date('2026-12-13T15:00:00.000Z')), 'Verano');
});

test('estacionActualTema resuelve por el huso de Buenos Aires', () => {
  assert.equal(estacionActualTema(new Date('2026-09-01T02:30:00.000Z')), 'Invierno'); // 31 ago AR
});

test('msHastaProximoMinuto descuenta segundos y milisegundos', () => {
  const d = new Date('2026-08-13T15:30:20.250Z');
  assert.equal(msHastaProximoMinuto(d), 39750);
});

test('msHastaProximoMinuto devuelve un minuto entero justo en el minuto redondo', () => {
  const d = new Date('2026-08-13T15:30:00.000Z');
  assert.equal(msHastaProximoMinuto(d), 60000);
});
