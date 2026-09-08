import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarSnapshot,
  debeHacerAutoBackup,
  copiasAPodar,
  nombreArchivoDescarga,
  APP_ID,
  FORMATO,
} from './backup-snapshot.js';

test('validarSnapshot rechaza valores no-objeto', () => {
  assert.equal(validarSnapshot(null).ok, false);
  assert.equal(validarSnapshot('x').ok, false);
  assert.equal(validarSnapshot(42).ok, false);
});

test('validarSnapshot rechaza app u formato desconocidos', () => {
  assert.equal(validarSnapshot({ app: 'otra', format: FORMATO, data: {} }).ok, false);
  assert.equal(validarSnapshot({ app: APP_ID, format: 99, data: {} }).ok, false);
});

test('validarSnapshot rechaza data sin ninguna clave reconocible', () => {
  assert.equal(validarSnapshot({ app: APP_ID, format: FORMATO, data: {} }).ok, false);
  assert.equal(validarSnapshot({ app: APP_ID, format: FORMATO }).ok, false);
});

test('validarSnapshot acepta el formato bueno y normaliza claves ausentes a []', () => {
  const r = validarSnapshot({
    app: APP_ID,
    format: FORMATO,
    user_id: 'u1',
    created_at: '2026-09-08T10:00:00.000Z',
    data: { user_collection: [{ id: 'c1' }] },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.snapshot.data.coleccion_cuidados, []);
  assert.deepEqual(r.snapshot.data.coleccion_fotos, []);
  assert.equal(r.snapshot.data.user_collection.length, 1);
});

test('validarSnapshot acepta un objeto que ya es el data (sin envoltorio)', () => {
  const r = validarSnapshot({ user_collection: [], coleccion_cuidados: [{ id: 'x' }], coleccion_fotos: [] });
  assert.equal(r.ok, true);
  assert.equal(r.snapshot.data.coleccion_cuidados.length, 1);
});

test('debeHacerAutoBackup: sin fecha previa => true', () => {
  assert.equal(debeHacerAutoBackup(null, '2026-09-08'), true);
});

test('debeHacerAutoBackup: mismo día => false', () => {
  assert.equal(debeHacerAutoBackup('2026-09-08T23:59:00.000Z', '2026-09-08'), false);
});

test('debeHacerAutoBackup: día anterior => true', () => {
  assert.equal(debeHacerAutoBackup('2026-09-07T00:00:00.000Z', '2026-09-08'), true);
});

test('copiasAPodar: conservar 7 con 7 filas => []', () => {
  const filas = Array.from({ length: 7 }, (_, i) => ({ id: String(i), created_at: `d${i}` }));
  assert.deepEqual(copiasAPodar(filas, 7), []);
});

test('copiasAPodar: 10 filas conservar 7 => las 3 últimas (más viejas)', () => {
  const filas = Array.from({ length: 10 }, (_, i) => ({ id: String(i), created_at: `d${i}` }));
  const podar = copiasAPodar(filas, 7);
  assert.deepEqual(podar.map((f) => f.id), ['7', '8', '9']);
});

test('nombreArchivoDescarga usa la fecha en formato AAAA-MM-DD', () => {
  assert.equal(
    nombreArchivoDescarga('2026-09-08T10:11:12.000Z'),
    'bitacora-plantas-2026-09-08.json',
  );
});
