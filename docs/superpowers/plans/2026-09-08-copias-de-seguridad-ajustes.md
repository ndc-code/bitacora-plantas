# Copias de seguridad + pantalla de Ajustes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al usuario una red de seguridad completa para su bitácora: copias de seguridad (nube + archivo `.json`) de su colección, cuidados y fotos, gestionadas desde una pantalla nueva de Ajustes.

**Architecture:** Tabla nueva `user_backups` con snapshots JSON de las tres tablas del usuario; los binarios de foto se copian dentro del bucket `plantas-fotos` bajo `{uid}/backups/{id}/…` para las copias en la nube y se incrustan en base64 en el `.json` descargable. Restaurar reemplaza todo, con una copia automática previa. Página `ajustes.html` con su `js/pages/ajustes.js`, y un link "Ajustes" en la nav que `auth-nav.js` muestra solo con sesión.

**Tech Stack:** HTML estático multipágina, JS ES modules sin bundler, `@supabase/supabase-js@2` por CDN, tests con `node --test` sobre `js/utils/*.test.js`.

**Spec:** `docs/superpowers/specs/2026-09-08-copias-de-seguridad-ajustes-design.md`

## Global Constraints

- Los tests automáticos solo cubren `js/utils/*.test.js`, ejecutados con `npm test` (`node --test "js/utils/*.test.js"`). Servicios y páginas se verifican a mano.
- Módulos ES (`import`/`export`), sin dependencias nuevas de npm ni librerías por CDN además de las ya presentes.
- El cliente Supabase es `import { supabase } from '../config.js'`. La sesión es `import { getSession } from './auth.js'` (devuelve `session` o `null`; `session.user.id` es el uuid).
- Bucket de Storage: `'plantas-fotos'`. Fotos vivas en `{user_id}/coleccion/{coleccion_id}/{archivo}`. Fotos de copia en `{user_id}/backups/{backup_id}/{coleccion_id}/{archivo}`.
- Tabla de copias: `'user_backups'`. Label de las automáticas: `'Copia automática'`. Se conservan `7` automáticas (`CONSERVAR_AUTO = 7`).
- Formato de snapshot: `{ app: 'bitacora-plantas', format: 1, user_id, created_at, data: { user_collection, coleccion_cuidados, coleccion_fotos } }`.
- Confirmaciones destructivas con `window.confirm` (patrón ya usado en `js/pages/planta.js`). Feedback inline con `showError` / `clearError` / `showStatus` de `js/utils/dom.js`. Sin librería de toasts.
- Copy en español rioplatense (vos), igual que el resto del proyecto.

---

### Task 1: Migración `0005_user_backups` + utilidades puras de snapshot

**Files:**
- Create: `supabase/migrations/0005_user_backups.sql`
- Create: `js/utils/backup-snapshot.js`
- Test: `js/utils/backup-snapshot.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `validarSnapshot(obj) -> { ok: true, snapshot: {app,format,user_id,created_at,data:{user_collection:[],coleccion_cuidados:[],coleccion_fotos:[]}} } | { ok: false, motivo: string }`
  - `debeHacerAutoBackup(ultimaFechaISO: string|null, hoyISO: string) -> boolean`
  - `copiasAPodar(filas: Array<{id,created_at}>, conservar: number) -> Array<{id,created_at}>` (filas entran ordenadas por `created_at` desc; devuelve las que sobran)
  - `nombreArchivoDescarga(fechaISO: string) -> string` (`'bitacora-plantas-AAAA-MM-DD.json'`)
  - `APP_ID = 'bitacora-plantas'`, `FORMATO = 1`

- [ ] **Step 1: Escribir el test que falla**

Create `js/utils/backup-snapshot.test.js`:

```js
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL — `Cannot find module './backup-snapshot.js'`.

- [ ] **Step 3: Implementar `js/utils/backup-snapshot.js`**

```js
export const APP_ID = 'bitacora-plantas';
export const FORMATO = 1;

const CLAVES_DATA = ['user_collection', 'coleccion_cuidados', 'coleccion_fotos'];

function normalizarData(data) {
  const out = {};
  for (const k of CLAVES_DATA) out[k] = Array.isArray(data?.[k]) ? data[k] : [];
  return out;
}

/**
 * Valida un objeto candidato a snapshot (de la nube o de un archivo `.json`).
 * Acepta tanto el objeto con envoltorio (`{ app, format, data }`) como un
 * objeto que ya sea el `data` (`{ user_collection, ... }`), para tolerar
 * archivos viejos o editados a mano.
 */
export function validarSnapshot(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, motivo: 'La copia está vacía o no es un objeto.' };
  }

  const pareceEnvoltorio = 'app' in obj || 'format' in obj || 'data' in obj;
  if (pareceEnvoltorio) {
    if (obj.app !== APP_ID) return { ok: false, motivo: 'El archivo no es una copia de Bitácora de Plantas.' };
    if (obj.format !== FORMATO) return { ok: false, motivo: `Formato de copia desconocido (${obj.format}).` };
    const data = obj.data;
    if (!data || typeof data !== 'object' || !CLAVES_DATA.some((k) => Array.isArray(data[k]))) {
      return { ok: false, motivo: 'La copia no tiene datos reconocibles.' };
    }
    return {
      ok: true,
      snapshot: {
        app: APP_ID,
        format: FORMATO,
        user_id: obj.user_id ?? null,
        created_at: obj.created_at ?? null,
        data: normalizarData(data),
      },
    };
  }

  if (!CLAVES_DATA.some((k) => Array.isArray(obj[k]))) {
    return { ok: false, motivo: 'La copia no tiene datos reconocibles.' };
  }
  return {
    ok: true,
    snapshot: { app: APP_ID, format: FORMATO, user_id: null, created_at: null, data: normalizarData(obj) },
  };
}

/** `true` si nunca se hizo una copia automática o la última fue antes de hoy. */
export function debeHacerAutoBackup(ultimaFechaISO, hoyISO) {
  if (!ultimaFechaISO) return true;
  return String(ultimaFechaISO).slice(0, 10) < hoyISO;
}

/**
 * De una lista de copias automáticas ordenada por `created_at` desc, devuelve
 * las que sobran después de conservar las `conservar` más nuevas.
 */
export function copiasAPodar(filas, conservar) {
  if (!Array.isArray(filas) || filas.length <= conservar) return [];
  return filas.slice(conservar);
}

export function nombreArchivoDescarga(fechaISO) {
  return `bitacora-plantas-${String(fechaISO).slice(0, 10)}.json`;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test`
Expected: PASS — todos los tests de `backup-snapshot.test.js` en verde, y los tests existentes sin regresiones.

- [ ] **Step 5: Crear la migración `supabase/migrations/0005_user_backups.sql`**

```sql
create table public.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  snapshot jsonb not null,
  photo_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index on public.user_backups (user_id, created_at desc);

alter table public.user_backups enable row level security;

-- `(select auth.uid())` para que Postgres cachee el valor una vez por consulta.
create policy "user_backups_owner_all" on public.user_backups
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Nota: los binarios de las copias van a {user_id}/backups/... en el bucket
-- 'plantas-fotos'. Las policies plantas_fotos_owner_* de 0001_init.sql chequean
-- solo el primer segmento de carpeta = auth.uid(), así que ya cubren ese path.
```

- [ ] **Step 6: Commit**

```bash
git add js/utils/backup-snapshot.js js/utils/backup-snapshot.test.js supabase/migrations/0005_user_backups.sql
git commit -m "$(printf 'Agregar utilidades de snapshot y migración user_backups\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 2: `js/services/backups.js` — snapshot, crear/listar/borrar y copia automática

**Files:**
- Create: `js/services/backups.js`

**Interfaces:**
- Consumes:
  - `supabase` de `../config.js`
  - `getSession` de `./auth.js`
  - `debeHacerAutoBackup`, `copiasAPodar` de `../utils/backup-snapshot.js`
  - `APP_ID`, `FORMATO` de `../utils/backup-snapshot.js`
- Produces:
  - `crearSnapshotActual() -> Promise<snapshot>` (sin `bytes_base64`, sin `backup_path`)
  - `crearCopia(label?: string) -> Promise<{ id, created_at, label }>`
  - `listarCopias() -> Promise<Array<{ id, label, photo_count, created_at }>>`
  - `borrarCopia(id: string) -> Promise<void>` (sin confirmación; la pide la página)
  - `autoBackupSiCorresponde() -> Promise<void>` (silenciosa, nunca lanza)
  - `TABLA = 'user_backups'`, `BUCKET = 'plantas-fotos'`, `LABEL_AUTO = 'Copia automática'`, `CONSERVAR_AUTO = 7`
  - `errorTablaAusente(e) -> boolean` (true si `e.code === '42P01'`)

- [ ] **Step 1: Implementar el módulo**

Create `js/services/backups.js`:

```js
import { supabase } from '../config.js';
import { getSession } from './auth.js';
import {
  APP_ID,
  FORMATO,
  debeHacerAutoBackup,
  copiasAPodar,
} from '../utils/backup-snapshot.js';

export const TABLA = 'user_backups';
export const BUCKET = 'plantas-fotos';
export const LABEL_AUTO = 'Copia automática';
export const CONSERVAR_AUTO = 7;

export function errorTablaAusente(e) {
  return Boolean(e) && e.code === '42P01';
}

async function requerirUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('No hay una sesión activa.');
  return session.user.id;
}

/**
 * Lee las tres tablas del usuario y arma el snapshot base (sin binarios).
 * `coleccion_cuidados` y `coleccion_fotos` se traen por los `coleccion_id` de
 * la colección del usuario, que es como están scopeadas por RLS.
 */
export async function crearSnapshotActual() {
  const userId = await requerirUserId();

  const { data: coleccion, error: e1 } = await supabase
    .from('user_collection')
    .select('*')
    .eq('user_id', userId);
  if (e1) throw e1;

  const ids = (coleccion || []).map((c) => c.id);
  let cuidados = [];
  let fotos = [];
  if (ids.length) {
    const [rc, rf] = await Promise.all([
      supabase.from('coleccion_cuidados').select('*').in('coleccion_id', ids),
      supabase.from('coleccion_fotos').select('*').in('coleccion_id', ids),
    ]);
    if (rc.error) throw rc.error;
    if (rf.error) throw rf.error;
    cuidados = rc.data || [];
    fotos = rf.data || [];
  }

  return {
    app: APP_ID,
    format: FORMATO,
    user_id: userId,
    created_at: new Date().toISOString(),
    data: {
      user_collection: coleccion || [],
      coleccion_cuidados: cuidados,
      coleccion_fotos: fotos,
    },
  };
}

function backupPathDe(userId, backupId, foto) {
  // storage_path vivo: {uid}/coleccion/{coleccion_id}/{archivo}
  // copia:            {uid}/backups/{backupId}/{coleccion_id}/{archivo}
  const cola = String(foto.storage_path).split('/').slice(2).join('/');
  return `${userId}/backups/${backupId}/${cola}`;
}

/**
 * Crea una copia en la nube: inserta la fila, copia cada binario de foto dentro
 * de Storage y guarda el `backup_path` de cada foto en el snapshot.
 */
export async function crearCopia(label = null) {
  const userId = await requerirUserId();
  const snapshot = await crearSnapshotActual();
  const fotos = snapshot.data.coleccion_fotos;

  const { data: fila, error } = await supabase
    .from(TABLA)
    .insert({ user_id: userId, label, snapshot, photo_count: fotos.length })
    .select('id,created_at,label')
    .single();
  if (error) throw error;

  if (fotos.length) {
    for (const foto of fotos) {
      const destino = backupPathDe(userId, fila.id, foto);
      const { error: eCopy } = await supabase.storage.from(BUCKET).copy(foto.storage_path, destino);
      if (eCopy) {
        console.warn('No se pudo copiar el binario de una foto a la copia', eCopy);
        continue;
      }
      foto.backup_path = destino;
    }
    const { error: eUpd } = await supabase.from(TABLA).update({ snapshot }).eq('id', fila.id);
    if (eUpd) throw eUpd;
  }

  return fila;
}

export async function listarCopias() {
  const userId = await requerirUserId();
  const { data, error } = await supabase
    .from(TABLA)
    .select('id,label,photo_count,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function borrarCopia(id) {
  const userId = await requerirUserId();

  const { data: fila, error: eSel } = await supabase
    .from(TABLA)
    .select('snapshot')
    .eq('id', id)
    .single();
  if (eSel) throw eSel;

  const paths = (fila?.snapshot?.data?.coleccion_fotos || [])
    .map((f) => f.backup_path)
    .filter(Boolean);
  if (paths.length) {
    const { error: eRm } = await supabase.storage.from(BUCKET).remove(paths);
    if (eRm) console.warn('No se pudieron borrar todos los binarios de la copia', eRm);
  }

  const { error } = await supabase.from(TABLA).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Poda las copias automáticas más viejas hasta dejar CONSERVAR_AUTO.
 * Best-effort: cualquier error se traga.
 */
async function podarAutomaticas() {
  try {
    const userId = await requerirUserId();
    const { data, error } = await supabase
      .from(TABLA)
      .select('id,created_at')
      .eq('user_id', userId)
      .eq('label', LABEL_AUTO)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    const sobran = copiasAPodar(data, CONSERVAR_AUTO);
    for (const fila of sobran) {
      try { await borrarCopia(fila.id); } catch (e) { /* best-effort */ }
    }
  } catch (e) { /* best-effort */ }
}

function claveUltimoAuto(userId) {
  return `ultima_copia_auto_${userId}`;
}

/**
 * Una copia automática por día y por usuario, silenciosa. Si la tabla no existe
 * o no hay conexión, no molesta y reintenta al día siguiente.
 */
export async function autoBackupSiCorresponde() {
  let userId;
  try { userId = await requerirUserId(); } catch (e) { return; }

  const hoy = new Date().toISOString().slice(0, 10);
  let marca = null;
  try { marca = localStorage.getItem(claveUltimoAuto(userId)); } catch (e) { /* modo privado */ }
  if (!debeHacerAutoBackup(marca, hoy)) return;

  try {
    // ¿ya hay una copia de hoy (de este u otro dispositivo)?
    const { data } = await supabase
      .from(TABLA)
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${hoy}T00:00:00Z`)
      .limit(1);
    if (!data || !data.length) {
      await crearCopia(LABEL_AUTO);
      await podarAutomaticas();
    }
    try { localStorage.setItem(claveUltimoAuto(userId), hoy); } catch (e) { /* modo privado */ }
  } catch (e) {
    // tabla ausente / offline: mañana se reintenta
  }
}
```

- [ ] **Step 2: Verificar sintaxis / import graph**

Run: `node --input-type=module -e "import('./js/services/backups.js').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"`
Expected: falla al resolver `../config.js` porque usa `window.supabase` (no hay `window` en Node). Es esperable. En su lugar validar solo el parseo:
Run: `node --check js/services/backups.js`
Expected: sin salida (parseo correcto).

- [ ] **Step 3: Correr la suite existente (sin regresiones)**

Run: `npm test`
Expected: PASS — la suite sigue igual; `backups.js` no tiene tests propios.

- [ ] **Step 4: Commit**

```bash
git add js/services/backups.js
git commit -m "$(printf 'Agregar servicio de copias: snapshot, crear, listar, borrar y auto-backup\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 3: `js/services/backups.js` — restaurar y archivo `.json`

**Files:**
- Modify: `js/services/backups.js`

**Interfaces:**
- Consumes: todo lo de Task 2, más `limpiarCacheColeccion` de `./coleccion.js` y `validarSnapshot` de `../utils/backup-snapshot.js`.
- Produces:
  - `restaurarCopia(id: string) -> Promise<{ fotosFallidas: number }>`
  - `restaurarDesdeSnapshot(snapshot, opciones: { fuente: 'nube'|'archivo' }) -> Promise<{ fotosFallidas: number }>`
  - `descargarArchivo() -> Promise<void>` (dispara la descarga del `.json`)
  - `leerArchivoDeCopia(file: File) -> Promise<snapshot>` (parsea + `validarSnapshot`; lanza `Error` con `.message` legible si es inválido)

- [ ] **Step 1: Agregar los imports que faltan**

En `js/services/backups.js`, ampliar los imports de utils y sumar el de colección:

```js
import {
  APP_ID,
  FORMATO,
  debeHacerAutoBackup,
  copiasAPodar,
  validarSnapshot,
  nombreArchivoDescarga,
} from '../utils/backup-snapshot.js';
import { limpiarCacheColeccion } from './coleccion.js';
```

- [ ] **Step 2: Implementar helpers de base64 y el borrado de lo vivo**

Agregar a `js/services/backups.js`:

```js
async function blobABase64(blob) {
  const buf = await blob.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ABlob(b64, tipo = 'application/octet-stream') {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Borra todas las filas vivas del usuario y sus binarios de foto. */
async function borrarTodoLoVivo(userId) {
  const { data: coleccion, error: eSel } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', userId);
  if (eSel) throw eSel;
  const ids = (coleccion || []).map((c) => c.id);

  if (ids.length) {
    const { data: fotos } = await supabase
      .from('coleccion_fotos')
      .select('storage_path')
      .in('coleccion_id', ids);

    const { error: eC } = await supabase.from('coleccion_cuidados').delete().in('coleccion_id', ids);
    if (eC) throw eC;
    const { error: eF } = await supabase.from('coleccion_fotos').delete().in('coleccion_id', ids);
    if (eF) throw eF;

    const paths = (fotos || []).map((f) => f.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: eRm } = await supabase.storage.from(BUCKET).remove(paths);
      if (eRm) console.warn('No se pudieron borrar todos los binarios vivos', eRm);
    }
  }

  const { error: eU } = await supabase.from('user_collection').delete().eq('user_id', userId);
  if (eU) throw eU;
}
```

- [ ] **Step 3: Implementar `restaurarDesdeSnapshot` y `restaurarCopia`**

```js
/**
 * Reemplazo total. Antes de tocar nada crea una copia de seguridad del estado
 * actual. No es atómico (varias tablas desde el navegador): la copia previa es
 * la red si se corta a la mitad.
 * Devuelve `{ fotosFallidas }` para que la página avise.
 */
export async function restaurarDesdeSnapshot(snapshot, { fuente }) {
  const userId = await requerirUserId();
  const { data } = snapshot;

  // 1. Copia previa (no bloquea si falla; la página ya avisó y confirmó).
  try {
    const cuando = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    await crearCopia(`Antes de restaurar (${cuando})`);
  } catch (e) {
    console.warn('No se pudo crear la copia previa a restaurar', e);
  }

  // 2. Borrar lo vivo.
  await borrarTodoLoVivo(userId);

  // 3. Reinsertar filas (mismos id). user_collection primero por las FK.
  if (data.user_collection.length) {
    const filas = data.user_collection.map((c) => ({ ...c, user_id: userId }));
    const { error } = await supabase.from('user_collection').insert(filas);
    if (error) throw error;
  }
  if (data.coleccion_cuidados.length) {
    const { error } = await supabase.from('coleccion_cuidados').insert(data.coleccion_cuidados);
    if (error) throw error;
  }
  if (data.coleccion_fotos.length) {
    const filas = data.coleccion_fotos.map(({ backup_path, bytes_base64, ...fila }) => fila);
    const { error } = await supabase.from('coleccion_fotos').insert(filas);
    if (error) throw error;
  }

  // 4. Reponer binarios de foto.
  let fotosFallidas = 0;
  for (const foto of data.coleccion_fotos) {
    try {
      if (fuente === 'nube') {
        if (!foto.backup_path) { fotosFallidas += 1; continue; }
        const { error } = await supabase.storage.from(BUCKET).copy(foto.backup_path, foto.storage_path);
        if (error) { fotosFallidas += 1; }
      } else {
        if (!foto.bytes_base64) { fotosFallidas += 1; continue; }
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(foto.storage_path, base64ABlob(foto.bytes_base64), { upsert: true });
        if (error) { fotosFallidas += 1; }
      }
    } catch (e) {
      fotosFallidas += 1;
    }
  }

  // 5. Limpiar caché local de colección.
  try { limpiarCacheColeccion(); } catch (e) { /* nada que hacer */ }

  return { fotosFallidas };
}

export async function restaurarCopia(id) {
  const { data: fila, error } = await supabase
    .from(TABLA)
    .select('snapshot')
    .eq('id', id)
    .single();
  if (error) throw error;
  const v = validarSnapshot(fila?.snapshot);
  if (!v.ok) throw new Error(v.motivo);
  return restaurarDesdeSnapshot(v.snapshot, { fuente: 'nube' });
}
```

- [ ] **Step 4: Implementar `descargarArchivo` y `leerArchivoDeCopia`**

```js
/**
 * Arma un `.json` autónomo: snapshot + cada foto en base64, y dispara la
 * descarga con un `<a download>` temporal.
 */
export async function descargarArchivo() {
  const snapshot = await crearSnapshotActual();
  for (const foto of snapshot.data.coleccion_fotos) {
    try {
      const { data: blob, error } = await supabase.storage.from(BUCKET).download(foto.storage_path);
      if (error || !blob) { continue; }
      foto.bytes_base64 = await blobABase64(blob);
      foto.bytes_mime = blob.type || 'application/octet-stream';
    } catch (e) {
      console.warn('No se pudo incrustar una foto en el .json', e);
    }
  }

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoDescarga(snapshot.created_at);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee y valida un `.json` de copia. Lanza `Error` legible si es inválido. */
export function leerArchivoDeCopia(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        reject(new Error('El archivo no es un JSON válido.'));
        return;
      }
      const v = validarSnapshot(parsed);
      if (!v.ok) { reject(new Error(v.motivo)); return; }
      // conservar bytes_base64 que validarSnapshot no copia
      const bruto = parsed.data ?? parsed;
      v.snapshot.data.coleccion_fotos = Array.isArray(bruto.coleccion_fotos) ? bruto.coleccion_fotos : [];
      resolve(v.snapshot);
    };
    reader.readAsText(file);
  });
}
```

- [ ] **Step 5: Verificar parseo y suite**

Run: `node --check js/services/backups.js`
Expected: sin salida.
Run: `npm test`
Expected: PASS — sin regresiones.

- [ ] **Step 6: Commit**

```bash
git add js/services/backups.js
git commit -m "$(printf 'Agregar restaurar (nube y archivo) y descarga .json al servicio de copias\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 4: Página `ajustes.html`

**Files:**
- Create: `ajustes.html`

**Interfaces:**
- Consumes: nada de JS todavía (Task 5 crea `js/pages/ajustes.js`, referenciado acá por `<script>`).
- Produces: los ids que `js/pages/ajustes.js` espera: `#ajustes-sin-sesion`, `#ajustes-contenido`, `#ajustes-error`, `#lista-copias`, `#btn-crear-copia`, `#btn-descargar-copia`, `#input-restaurar-archivo`, `#btn-abrir-login-ajustes`. Reusa el layout de `riegos.html` y el modal `#dialog-auth`.

- [ ] **Step 1: Crear `ajustes.html`**

Copiar la estructura de `riegos.html` cambiando `<title>`, la clase de `<body>`, el `is-active` de la nav (ninguno de Index/Colección/Riegos queda activo; Ajustes no está en la nav principal), el contenido de `<main>`, y el `<script>` final. Contenido completo:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ajustes — Bitácora de Plantas</title>
  <script>
    try {
      if (localStorage.getItem('tema') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
  </script>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body class="catalog-page catalog-page--ajustes">
  <header class="catalog-header">
    <p class="catalog-header-left">
      Copias de seguridad de tu colección, bitácora y fotos.
    </p>
    <nav class="catalog-nav" aria-label="Principal">
      <a class="catalog-nav-link" href="index.html">Index</a>
      <a class="catalog-nav-link" href="coleccion.html">Colección</a>
      <a class="catalog-nav-link" href="riegos.html">Riegos</a>
      <a class="catalog-nav-link is-active" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
    </nav>
    <button
      type="button"
      class="catalog-menu-toggle"
      id="catalog-menu-toggle"
      aria-expanded="false"
      aria-controls="catalog-sidebar"
    >
      Menú
    </button>
    <div class="catalog-meta">
      <p>
        Buenos Aires, ARG <time data-reloj>00:00</time>
        <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
        <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
      </p>
      <button type="button" class="catalog-auth-btn" data-auth-nav>Iniciar sesión</button>
      <a class="catalog-auth-btn" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
    </div>
  </header>

  <aside class="catalog-sidebar" id="catalog-sidebar" aria-label="Menú de navegación">
    <div class="catalog-sidebar-top">
      <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
      <button type="button" class="catalog-sidebar-close" id="catalog-sidebar-close">Cerrar</button>
    </div>
    <p class="catalog-sidebar-label">(Navegación)</p>
    <nav class="catalog-sidebar-nav" aria-label="Principal">
      <a class="catalog-sidebar-link" href="index.html">Index</a>
      <a class="catalog-sidebar-link" href="coleccion.html">Colección</a>
      <a class="catalog-sidebar-link" href="riegos.html">Riegos</a>
      <a class="catalog-sidebar-link is-active" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
    </nav>
    <p class="catalog-sidebar-datetime">Buenos Aires, ARG <time data-reloj>00:00</time></p>
    <button type="button" class="catalog-sidebar-auth-btn" data-auth-nav>Iniciar sesión</button>
    <a class="catalog-sidebar-auth-btn" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
  </aside>

  <main id="ajustes-main" class="ajustes-main">
    <p id="ajustes-sin-sesion" class="catalog-empty" hidden>
      Iniciá sesión para gestionar tus copias de seguridad.
      <button type="button" class="btn btn-primary" id="btn-abrir-login-ajustes">Iniciar sesión</button>
    </p>

    <section id="ajustes-contenido" class="ajustes-seccion" hidden>
      <h1 class="ajustes-titulo">Copias de seguridad</h1>
      <p class="ajustes-nota">
        Una copia guarda una foto completa de todo: tu colección, la bitácora de
        cada planta (riegos y notas) y las fotos de galería. Si algún día se
        borra o se rompe algo, restaurás y vuelve tal cual estaba. Se hace una
        copia automática por día; también podés crear una ahora o descargar un
        archivo para guardar por tu cuenta.
      </p>

      <div class="ajustes-acciones">
        <button type="button" class="btn btn-primary" id="btn-crear-copia">Crear copia ahora</button>
        <button type="button" class="btn btn-secondary" id="btn-descargar-copia">Descargar copia (.json)</button>
        <label class="btn btn-secondary ajustes-restaurar-archivo">
          Restaurar desde archivo
          <input type="file" accept="application/json,.json" id="input-restaurar-archivo" hidden />
        </label>
      </div>

      <p class="field-error" id="ajustes-error" hidden></p>
      <p class="field-status" id="ajustes-estado" hidden></p>

      <div id="lista-copias" class="ajustes-lista"></div>
    </section>
  </main>

  <dialog id="dialog-auth" class="modal">
    <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
    <p class="field-error" id="error-pagina-auth" hidden></p>
    <h2 id="titulo-form-auth">Iniciar sesión</h2>

    <form id="form-auth">
      <div class="field">
        <label for="email-auth">Email</label>
        <input class="input" type="email" id="email-auth" required />
      </div>
      <div class="field">
        <label for="password-auth">Contraseña</label>
        <input class="input" type="password" id="password-auth" minlength="6" required />
      </div>
      <p class="field-error" id="error-auth" hidden></p>
      <p class="field-status" id="status-auth" hidden></p>
      <button class="btn btn-primary" type="submit" id="btn-submit-auth">Iniciar sesión</button>
    </form>

    <p style="margin-top: var(--space-6);">
      <button class="btn-secondary btn" type="button" id="btn-toggle-auth">¿No tenés cuenta? Creá una</button>
    </p>
  </dialog>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="js/pages/ajustes.js"></script>
</body>
</html>
```

- [ ] **Step 2: Agregar estilos mínimos en `css/styles.css`**

Al final de `css/styles.css`, reusando variables ya definidas en el archivo (`--space-*`, `--line`, `--body-muted`, etc. — verificar los nombres reales en el `:root` del archivo y ajustar):

```css
/* ---- Ajustes: copias de seguridad ---- */
.ajustes-main { padding: var(--space-6); max-width: 720px; margin: 0 auto; }
.ajustes-titulo { margin: 0 0 var(--space-3); }
.ajustes-nota { color: var(--body-muted); margin: 0 0 var(--space-5); }
.ajustes-acciones { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4); }
.ajustes-restaurar-archivo { cursor: pointer; }
.ajustes-lista { margin-top: var(--space-4); }
.ajustes-copia-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--line); }
.ajustes-copia-row:last-child { border-bottom: none; }
.ajustes-copia-main { flex: 1; min-width: 0; }
.ajustes-copia-when { font-weight: 600; }
.ajustes-copia-label { font-size: 0.85rem; color: var(--body-muted); }
.ajustes-copia-row .btn { flex: 0 0 auto; }
```

- [ ] **Step 3: Verificación manual**

Abrir `ajustes.html` con un server estático (`python3 -m http.server` desde la raíz) y confirmar: la página carga sin errores de consola salvo el esperable de `js/pages/ajustes.js` si todavía no existe (esta task no lo crea). El layout (header, sidebar, toggle de tema, reloj) se ve igual que `riegos.html`.

- [ ] **Step 4: Commit**

```bash
git add ajustes.html css/styles.css
git commit -m "$(printf 'Agregar pantalla de Ajustes con la UI de copias de seguridad\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 5: `js/pages/ajustes.js` — cableado de la página

**Files:**
- Create: `js/pages/ajustes.js`

**Interfaces:**
- Consumes:
  - `qs`, `showError`, `clearError`, `showStatus`, `clearStatus`, `escapeHtml` de `../utils/dom.js`
  - `getSession` de `../services/auth.js`
  - `wireAuthModal` de `../utils/auth-modal.js`
  - `wireAuthNav` de `../utils/auth-nav.js`
  - `wireReloj` de `../utils/reloj.js`
  - `wireThemeToggle` de `../utils/theme.js`
  - `iniciarPagina` de `../utils/guard.js`
  - de `../services/backups.js`: `listarCopias`, `crearCopia`, `borrarCopia`, `restaurarCopia`, `descargarArchivo`, `leerArchivoDeCopia`, `restaurarDesdeSnapshot`, `autoBackupSiCorresponde`, `errorTablaAusente`
- Produces: nada (punto de entrada de página).

- [ ] **Step 1: Implementar `js/pages/ajustes.js`**

```js
import { qs, showError, clearError, showStatus, clearStatus, escapeHtml } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { wireThemeToggle } from '../utils/theme.js';
import { iniciarPagina } from '../utils/guard.js';
import {
  listarCopias,
  crearCopia,
  borrarCopia,
  restaurarCopia,
  descargarArchivo,
  leerArchivoDeCopia,
  restaurarDesdeSnapshot,
  autoBackupSiCorresponde,
  errorTablaAusente,
} from '../services/backups.js';

const MSG_TABLA_AUSENTE =
  'La tabla de copias todavía no existe en Supabase. Hay que correr la migración ' +
  'supabase/migrations/0005_user_backups.sql. Mientras tanto podés usar «Descargar copia (.json)».';

const authModal = wireAuthModal();
const authNav = wireAuthNav({ onLogin: abrirLogin });

function errorEl() { return qs('#ajustes-error'); }
function estadoEl() { return qs('#ajustes-estado'); }

function mostrarError(e) {
  showError(errorEl(), errorTablaAusente(e) ? MSG_TABLA_AUSENTE : mensajeDe(e));
}
function mensajeDe(e) {
  return `No se pudo completar la operación: ${e?.message ?? 'error desconocido'}`;
}
function limpiarMensajes() {
  clearError(errorEl());
  clearStatus(estadoEl());
}

function abrirLogin() {
  authModal.open({
    onSuccess: async () => {
      await authNav.sync();
      await entrar();
    },
  });
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function renderLista() {
  const box = qs('#lista-copias');
  box.innerHTML = '<p class="ajustes-nota">Cargando copias…</p>';
  let copias;
  try {
    copias = await listarCopias();
  } catch (e) {
    box.innerHTML = '';
    mostrarError(e);
    return;
  }
  if (!copias.length) {
    box.innerHTML = '<p class="ajustes-nota">Todavía no hay copias. Creá la primera con el botón de arriba.</p>';
    return;
  }
  box.innerHTML = copias
    .map((c) => `
      <div class="ajustes-copia-row" data-id="${escapeHtml(c.id)}">
        <div class="ajustes-copia-main">
          <div class="ajustes-copia-when">${escapeHtml(formatearFecha(c.created_at))}</div>
          <div class="ajustes-copia-label">${escapeHtml(c.label || 'Copia')} · ${c.photo_count || 0} foto(s)</div>
        </div>
        <button type="button" class="btn btn-secondary" data-accion="restaurar">Restaurar</button>
        <button type="button" class="btn btn-secondary" data-accion="borrar" aria-label="Borrar copia">Borrar</button>
      </div>
    `)
    .join('');
}

async function onCrearCopia() {
  limpiarMensajes();
  if (!window.confirm('¿Crear una copia de seguridad ahora con el estado actual?')) return;
  const btn = qs('#btn-crear-copia');
  btn.disabled = true;
  try {
    await crearCopia('Copia manual');
    showStatus(estadoEl(), 'Copia de seguridad creada.');
    await renderLista();
  } catch (e) {
    mostrarError(e);
  } finally {
    btn.disabled = false;
  }
}

async function onDescargar() {
  limpiarMensajes();
  const btn = qs('#btn-descargar-copia');
  btn.disabled = true;
  try {
    showStatus(estadoEl(), 'Preparando el archivo…');
    await descargarArchivo();
    showStatus(estadoEl(), 'Archivo descargado.');
  } catch (e) {
    mostrarError(e);
  } finally {
    btn.disabled = false;
  }
}

async function onRestaurarArchivo(input) {
  limpiarMensajes();
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;

  let snapshot;
  try {
    snapshot = await leerArchivoDeCopia(file);
  } catch (e) {
    showError(errorEl(), `No se pudo restaurar: ${e.message}`);
    return;
  }
  if (!window.confirm(
    'Restaurar desde este archivo reemplaza TODA tu colección, bitácora y fotos ' +
    'actuales. Antes se guarda una copia automática del estado actual. ¿Seguir?',
  )) return;

  try {
    showStatus(estadoEl(), 'Restaurando…');
    const { fotosFallidas } = await restaurarDesdeSnapshot(snapshot, { fuente: 'archivo' });
    avisarRestauracion(fotosFallidas);
  } catch (e) {
    mostrarError(e);
  }
}

async function onListaClick(event) {
  const btn = event.target.closest('button[data-accion]');
  if (!btn) return;
  const row = btn.closest('.ajustes-copia-row');
  const id = row?.dataset.id;
  if (!id) return;
  limpiarMensajes();

  if (btn.dataset.accion === 'borrar') {
    if (!window.confirm('¿Borrar esta copia de seguridad? Tus datos actuales no se tocan.')) return;
    try {
      await borrarCopia(id);
      showStatus(estadoEl(), 'Copia borrada.');
      await renderLista();
    } catch (e) {
      mostrarError(e);
    }
    return;
  }

  if (btn.dataset.accion === 'restaurar') {
    if (!window.confirm(
      'Restaurar esta copia reemplaza TODA tu colección, bitácora y fotos ' +
      'actuales por las de la copia. Antes se guarda una copia automática del ' +
      'estado actual, así que se puede volver. ¿Restaurar?',
    )) return;
    try {
      showStatus(estadoEl(), 'Restaurando…');
      const { fotosFallidas } = await restaurarCopia(id);
      avisarRestauracion(fotosFallidas);
      await renderLista();
    } catch (e) {
      mostrarError(e);
    }
  }
}

function avisarRestauracion(fotosFallidas) {
  if (fotosFallidas > 0) {
    showError(errorEl(), `Datos restaurados, pero ${fotosFallidas} foto(s) no se pudieron reponer.`);
  } else {
    showStatus(estadoEl(), 'Datos restaurados. Recargá la colección para verlos.');
  }
}

function wireSidebarToggle() {
  const toggle = qs('#catalog-menu-toggle');
  if (!toggle) return;
  const sidebar = qs('#catalog-sidebar');
  const cerrar = () => {
    sidebar?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');
  };
  toggle.addEventListener('click', () => {
    const abierto = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', abierto);
    document.body.classList.toggle('sidebar-open', abierto);
  });
  qs('#catalog-sidebar-close')?.addEventListener('click', cerrar);
}

async function entrar() {
  const haySesion = Boolean(await getSession());
  qs('#ajustes-sin-sesion').hidden = haySesion;
  qs('#ajustes-contenido').hidden = !haySesion;
  if (!haySesion) return;

  await renderLista();
  autoBackupSiCorresponde().then(() => renderLista()).catch(() => {});
}

iniciarPagina(async function init() {
  wireReloj();
  wireThemeToggle();
  wireSidebarToggle();
  await authNav.sync();

  qs('#btn-abrir-login-ajustes')?.addEventListener('click', abrirLogin);
  qs('#btn-crear-copia').addEventListener('click', onCrearCopia);
  qs('#btn-descargar-copia').addEventListener('click', onDescargar);
  qs('#input-restaurar-archivo').addEventListener('change', (e) => onRestaurarArchivo(e.target));
  qs('#lista-copias').addEventListener('click', onListaClick);

  await entrar();
});
```

- [ ] **Step 2: Verificar parseo y suite**

Run: `node --check js/pages/ajustes.js`
Expected: sin salida.
Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Verificación manual (con server estático y sesión de prueba)**

Desde la raíz: `python3 -m http.server 8000`, abrir `http://localhost:8000/ajustes.html`.
- Sin sesión: se ve "Iniciá sesión para gestionar tus copias"; el botón abre el modal.
- Con sesión (login por el modal): aparece el contenido, la lista carga (vacía o con copias), y a los pocos segundos aparece una "Copia automática" (auto-backup del día). Consola sin errores rojos.
- "Crear copia ahora" → confirma → aparece "Copia manual" en la lista.
- "Descargar copia (.json)" → baja un archivo `bitacora-plantas-AAAA-MM-DD.json` con `data.user_collection` y, si hay fotos, `bytes_base64`.

- [ ] **Step 4: Commit**

```bash
git add js/pages/ajustes.js
git commit -m "$(printf 'Cablear la página de Ajustes al servicio de copias\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 6: Link "Ajustes" en la navegación de todas las páginas

**Files:**
- Modify: `js/utils/auth-nav.js`
- Modify: `index.html`, `coleccion.html`, `riegos.html`, `bitacora.html`, `planta.html`

**Interfaces:**
- Consumes: el `sync()` existente de `wireAuthNav`.
- Produces: los `[data-ajustes-link]` visibles solo con sesión.

- [ ] **Step 1: Modificar `js/utils/auth-nav.js` para togglear el link**

En la función `sync()` de `wireAuthNav`, después del `botones.forEach(...)` que ajusta los `[data-auth-nav]`, agregar:

```js
    qsa('[data-ajustes-link]').forEach((link) => {
      link.hidden = !haySesion;
    });
```

`qsa` ya está importado en el archivo. `haySesion` ya está calculado en ese scope.

- [ ] **Step 2: Agregar el markup en las 5 páginas**

En `index.html`, `coleccion.html`, `riegos.html`, `bitacora.html` y `planta.html`, agregar el link en los tres lugares de navegación. El `href` es siempre `ajustes.html` y va con `hidden` (lo muestra `auth-nav.js`).

Dentro de `<nav class="catalog-nav">`, como último `<a>`:
```html
      <a class="catalog-nav-link" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
```

Inmediatamente después del `<button ... data-auth-nav>` dentro de `<div class="catalog-meta">`:
```html
      <a class="catalog-auth-btn" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
```

Dentro de `<nav class="catalog-sidebar-nav">`, como último `<a>`:
```html
      <a class="catalog-sidebar-link" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
```

Inmediatamente después del `<button ... class="catalog-sidebar-auth-btn" data-auth-nav>`:
```html
      <a class="catalog-sidebar-auth-btn" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
```

Notas:
- `planta.html` y `bitacora.html` pueden tener una nav más corta o un botón "Volver"; agregar el link en los mismos contenedores que sí existan (`catalog-nav`, `catalog-meta`, `catalog-sidebar-nav`, sidebar auth). Si algún contenedor no existe en esa página, omitir solo ese.
- No marcar `is-active` en ninguna de estas páginas (solo `ajustes.html` lo lleva).

- [ ] **Step 3: Verificación manual**

Server estático, con sesión iniciada: en cada página (`index`, `coleccion`, `riegos`, `bitacora?id=…`, `planta?id=…`) aparece "Ajustes" al lado de "Cerrar sesión" en el header y en el sidebar, y en la nav principal. Al cerrar sesión, "Ajustes" desaparece en todas. El link lleva a `ajustes.html`.

- [ ] **Step 4: Correr la suite**

Run: `npm test`
Expected: PASS — `auth-nav.js` no tiene test propio; confirmar que nada más se rompió.

- [ ] **Step 5: Commit**

```bash
git add js/utils/auth-nav.js index.html coleccion.html riegos.html bitacora.html planta.html
git commit -m "$(printf 'Mostrar el link Ajustes en la navegación cuando hay sesión\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-Review

**1. Spec coverage:**
- Migración `0005_user_backups` + RLS → Task 1 Step 5. ✓
- Storage path `{uid}/backups/...` sin policy nueva → nota en Task 1 Step 5 + `backupPathDe` en Task 2. ✓
- Formato de snapshot (envoltorio + `data` + `bytes_base64` en archivo) → Task 1 (`validarSnapshot`), Task 2 (`crearSnapshotActual`), Task 3 (`descargarArchivo`). ✓
- `js/utils/backup-snapshot.js` puro + tests (`validarSnapshot`, `debeHacerAutoBackup`, `copiasAPodar`, `nombreArchivoDescarga`) → Task 1. ✓
- Servicio: `crearSnapshotActual`, `crearCopia`, `listarCopias`, `borrarCopia`, `restaurarCopia`/`restaurarDesdeSnapshot`, `descargarArchivo`, `restaurarDesdeArchivo` (acá `leerArchivoDeCopia` + `restaurarDesdeSnapshot`), `autoBackupSiCorresponde` → Tasks 2 y 3. ✓
- Flujo de restaurar: confirmación, copia previa, borrado ordenado, reinserción con mismos id, reposición de binarios, `limpiarCacheColeccion` → Task 3 `restaurarDesdeSnapshot`. ✓
- `ajustes.html` con layout de `riegos.html`, sin-sesión vs contenido, botones y lista → Task 4. ✓
- `js/pages/ajustes.js`: guard de sesión, modal de auth, auto-backup al entrar → Task 5. ✓
- Botón/link "Ajustes" al lado de sesión, visible solo con sesión, en las 5 páginas + toggle en `auth-nav.js` → Task 6. ✓
- Errores: tabla ausente `42P01` con fallback a descarga; fotos fallidas contadas; `.json` inválido con motivo → Task 3 (`errorTablaAusente`, `fotosFallidas`, `leerArchivoDeCopia`) y Task 5 (`MSG_TABLA_AUSENTE`, `avisarRestauracion`). ✓
- Retención 7 automáticas → `CONSERVAR_AUTO` en Task 2, `podarAutomaticas`. ✓
- Tests con `node --test` solo en utils → Task 1. ✓

**2. Placeholder scan:** sin "TBD"/"TODO"/"etc." accionables. Task 4 Step 2 pide "verificar los nombres reales de las variables CSS en `:root`" — es una instrucción concreta de adaptación, no un placeholder de lógica. Task 6 Step 2 contempla explícitamente el caso de contenedores de nav ausentes en `planta.html`/`bitacora.html`.

**3. Type consistency:**
- `validarSnapshot` devuelve `{ ok, snapshot }` / `{ ok, motivo }` — usado igual en Task 3 (`leerArchivoDeCopia`, `restaurarCopia`).
- `crearCopia(label?)` firma consistente entre Task 2 (definición) y Task 3 (`restaurarDesdeSnapshot` la llama con un string).
- `restaurarDesdeSnapshot(snapshot, { fuente })` con `fuente: 'nube'|'archivo'` — consistente entre Task 3 y las llamadas de Task 5.
- `restaurarCopia(id)` y `restaurarDesdeSnapshot(...)` devuelven `{ fotosFallidas }` — Task 5 lo desestructura así en `avisarRestauracion`.
- `errorTablaAusente(e)` definido en Task 2, importado en Task 5.
- `listarCopias()` devuelve filas con `id,label,photo_count,created_at` — Task 5 usa esos cuatro campos.
- `backupPathDe`/`borrarTodoLoVivo`/`podarAutomaticas` son internos (no exportados), sin choque de nombres.
