# Tema automático por día y estación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reemplazar el toggle día/noche manual por un tema 100% automático (día/noche por hora de Buenos Aires, estación por mes) que tiñe todo el sitio con el color de la estación, y pasar el reloj al formato `"19:18 AR 08 SEP 2026"`.

**Architecture:** Se portan tres utilidades de `inspo/bitacora-filotaxia` (`theme.js`, `reloj.js`, `catalog-season-theme.js` nuevo) y sus tests, se agregan los bloques `:root[data-season]` al CSS, se cambia el script anti-flash del `<head>` de las 6 páginas y el markup del navbar/sidebar.

**Tech Stack:** HTML estático multipágina, JS ES modules sin bundler, tests `node --test "js/utils/*.test.js"`.

**Spec:** `docs/superpowers/specs/2026-09-08-tema-dia-estacion-automatico-design.md`

## Global Constraints

- Zona horaria fija `America/Argentina/Buenos_Aires`; locale `es-AR` (salvo el mes numérico, que usa `en-US`).
- Cortes día/noche fijos: Día `[6, 18)`, Noche resto.
- Estaciones por mes calendario, hemisferio sur, índice 0 = enero: `['Verano','Verano','Otoño','Otoño','Otoño','Invierno','Invierno','Invierno','Invierno','Primavera','Primavera','Verano']`.
- `data-season` en `<html>` sin acentos y en minúscula: `otoño` → `otono`.
- Sin `localStorage`, sin listeners de click, sin `transition` CSS en el cambio de color.
- Colores de estación: invierno `#3c6ef6`, primavera `#52ea90`, verano `#fdf251`, otoño `#e8412e`.
- Tests solo en `js/utils/*.test.js` (`npm test`). Páginas y CSS: verificación manual.
- Copy en español rioplatense.

---

### Task 1: Portar `js/utils/theme.js` (momento del día automático)

**Files:**
- Modify: `js/utils/theme.js` (reescritura completa)
- Modify: `js/utils/theme.test.js` (reemplazo)

**Interfaces:**
- Produces: `TEMA_DIA='light'`, `TEMA_NOCHE='dark'`, `momentoActual(date) -> 'light'|'dark'`, `aplicarMomentoTema(date) -> 'light'|'dark'`, `etiquetaParaTema(tema) -> 'Día'|'Noche'`, `wireThemeToggle() -> void`.

- [ ] **Step 1: Reemplazar `js/utils/theme.test.js`**

```js
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
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL — `theme.js` todavía exporta `temaOpuesto`/`TEMA_CLARO`, no `momentoActual`.

- [ ] **Step 3: Reescribir `js/utils/theme.js`**

```js
import { qsa } from './dom.js';

export const TEMA_DIA = 'light';
export const TEMA_NOCHE = 'dark';

// El cartel dice la hora de Buenos Aires: el momento del día se calcula
// siempre sobre esa ciudad, no la local del dispositivo.
const ZONA = 'America/Argentina/Buenos_Aires';

const formatoHoraZona = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  hour: '2-digit',
  hour12: false,
});

// El texto nombra el estado actual, no una acción.
export function etiquetaParaTema(tema) {
  if (tema === TEMA_NOCHE) return 'Noche';
  return 'Día';
}

/**
 * Momento del día según la hora de Buenos Aires, con corte fijo (no salida ni
 * puesta de sol reales): Día 06–18, Noche 18–06.
 */
export function momentoActual(date = new Date()) {
  // `hour: '2-digit'` con `hour12: false` puede devolver "24" a medianoche
  // en algunos motores; el `% 24` lo normaliza a 0.
  const hora = Number(formatoHoraZona.format(date)) % 24;
  return hora >= 6 && hora < 18 ? TEMA_DIA : TEMA_NOCHE;
}

/**
 * Fija el `data-theme` de `<html>` al momento del día real y refleja su
 * nombre en los `[data-theme-toggle]`. El reloj (js/utils/reloj.js) la llama
 * en cada tick de minuto, así el tema cambia solo al cruzar un corte horario
 * con la página abierta.
 */
export function aplicarMomentoTema(date = new Date()) {
  const raiz = document.documentElement;
  const tema = momentoActual(date);
  if (tema === TEMA_DIA) {
    raiz.removeAttribute('data-theme');
  } else {
    raiz.setAttribute('data-theme', tema);
  }
  qsa('[data-theme-toggle]').forEach((el) => {
    el.textContent = etiquetaParaTema(tema);
  });
  return tema;
}

/**
 * Aplica el momento del día una vez al cargar la página. Ya no hay ciclado
 * manual: el usuario no elige el tema, lo marca el reloj.
 */
export function wireThemeToggle() {
  aplicarMomentoTema();
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: los tests de `theme.test.js` en verde. `reloj.test.js` va a fallar (Task 2) — anotarlo y seguir.

- [ ] **Step 5: Commit**

```bash
git add js/utils/theme.js js/utils/theme.test.js
git commit -m "$(printf 'Tema: momento del día automático por hora de Buenos Aires\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 2: Portar `js/utils/reloj.js` + `js/utils/catalog-season-theme.js`

**Files:**
- Modify: `js/utils/reloj.js` (reescritura completa)
- Create: `js/utils/catalog-season-theme.js`
- Modify: `js/utils/reloj.test.js` (reemplazo)

**Interfaces:**
- Consumes: `aplicarMomentoTema` de `./theme.js`.
- Produces (reloj.js): `ZONA`, `estacionActualTema(date) -> string`, `formatearHoraCompleta(date) -> string`, `formatearFechaEstacion(date) -> string`, `formatearEstacion(date) -> string`, `msHastaProximoMinuto(date) -> number`, `wireReloj() -> () => void`.
- Produces (catalog-season-theme.js): `aplicarEstacionTema(date) -> string`, `wireSeasonTheme() -> void`.

- [ ] **Step 1: Reemplazar `js/utils/reloj.test.js`**

```js
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
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL — `reloj.js` todavía exporta `formatearFechaHora`, no `formatearHoraCompleta`.

- [ ] **Step 3: Crear `js/utils/catalog-season-theme.js`**

```js
import { qsa } from './dom.js';
import { estacionActualTema } from './reloj.js';

function sinAcentos(str) {
  return str.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Fija el `data-season` de `<html>` a la estación real (por mes calendario,
 * hemisferio sur — ver `estacionActualTema`) y refleja su nombre en los
 * `[data-estacion-tema]`. El reloj (js/utils/reloj.js) la llama en cada tick
 * de minuto, así el tema cambia solo al cambiar de mes con la página abierta.
 */
export function aplicarEstacionTema(date = new Date()) {
  const estacion = estacionActualTema(date);
  document.documentElement.setAttribute('data-season', sinAcentos(estacion));
  qsa('[data-estacion-tema]').forEach((el) => {
    el.textContent = estacion;
  });
  return estacion;
}

/**
 * Aplica la estación real una vez al cargar la página. Ya no hay ciclado
 * manual: el usuario no elige la estación, la marca el calendario.
 */
export function wireSeasonTheme() {
  aplicarEstacionTema();
}
```

- [ ] **Step 4: Reescribir `js/utils/reloj.js`**

```js
import { qsa } from './dom.js';
import { aplicarEstacionTema } from './catalog-season-theme.js';
import { aplicarMomentoTema } from './theme.js';

/**
 * El cartel dice la hora de Buenos Aires: quien entre desde otro huso ve la
 * misma que acá y la etiqueta nunca miente. Por eso el huso es fijo.
 */
export const ZONA = 'America/Argentina/Buenos_Aires';

const LOCALE = 'es-AR';

const formatoFecha = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: ZONA,
});

const formatoMes = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: ZONA });

const formatoHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatoFechaCorta = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function partesPor(date, formatter) {
  return Object.fromEntries(formatter.formatToParts(date).map((parte) => [parte.type, parte.value]));
}

// Estaciones meteorológicas del hemisferio sur, agrupadas por mes calendario
// (índice 0 = enero ... 11 = diciembre).
const ESTACIONES = [
  'Verano', 'Verano', 'Otoño', 'Otoño', 'Otoño', 'Invierno',
  'Invierno', 'Invierno', 'Invierno', 'Primavera', 'Primavera', 'Verano',
];

/**
 * Estación de Buenos Aires para la fecha dada, por mes calendario.
 */
export function estacionActualTema(date = new Date()) {
  const mes = Number(formatoMes.format(date));
  return ESTACIONES[mes - 1];
}

/**
 * Devuelve la fecha y estación de Buenos Aires como "13 ago Invierno".
 */
export function formatearFechaEstacion(date = new Date()) {
  return `${formatoFecha.format(date)} ${estacionActualTema(date)}`;
}

export function formatearEstacion(date = new Date()) {
  return estacionActualTema(date);
}

/**
 * Devuelve hora, huso (literal "AR") y fecha con el mes abreviado en mayúscula:
 * "19:18 AR 08 SEP 2026". El huso es literal porque la zona es fija.
 */
export function formatearHoraCompleta(date = new Date()) {
  const { hour, minute } = partesPor(date, formatoHora);
  const { day, month, year } = partesPor(date, formatoFechaCorta);
  // es-AR abrevia los meses a 3 letras salvo septiembre ("sept."). Sacamos
  // cualquier punto, recortamos a 3 y pasamos a mayúscula -> "SEP", "AGO".
  const mes = month.replace('.', '').slice(0, 3).toUpperCase();
  return `${hour}:${minute} AR ${day} ${mes} ${year}`;
}

/**
 * Milisegundos que faltan para el próximo minuto redondo.
 */
export function msHastaProximoMinuto(date = new Date()) {
  return 60000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}

/**
 * Tick único de la página: cada minuto reescribe la hora en los
 * `[data-hora-completa]` y re-aplica el tema por estación y por momento del
 * día. Devuelve una función para frenarlo.
 */
export function wireReloj() {
  const horasCompletas = qsa('[data-hora-completa]');

  let timer = null;

  function pintar() {
    const ahora = new Date();
    horasCompletas.forEach((el) => {
      el.textContent = formatearHoraCompleta(ahora);
      if (el.tagName === 'TIME') el.setAttribute('datetime', ahora.toISOString());
    });

    aplicarEstacionTema(ahora);
    aplicarMomentoTema(ahora);

    timer = setTimeout(pintar, msHastaProximoMinuto(ahora));
  }

  pintar();

  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npm test`
Expected: PASS — `reloj.test.js` y `theme.test.js` en verde, sin regresiones en el resto.

- [ ] **Step 6: Commit**

```bash
git add js/utils/reloj.js js/utils/reloj.test.js js/utils/catalog-season-theme.js
git commit -m "$(printf 'Reloj: formato "HH:MM AR DD MMM AAAA" y tema por estación automático\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 3: CSS — paleta por estación

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Agregar los bloques de estación después de `:root[data-theme='dark'] { ... }`**

```css
/*
 * Tema por estación (inspirado en bergerfohr.com). `data-season` lo fija el JS
 * a la estación real de Buenos Aires por mes de calendario (ver
 * js/utils/reloj.js -> estacionActualTema y catalog-season-theme.js); el
 * usuario no lo elige. Está siempre presente y tiñe todo el sitio con el
 * color de la estación según el momento del día (`data-theme`, también auto).
 */
:root[data-season='invierno']  { --color-estacion: #3c6ef6; }
:root[data-season='primavera'] { --color-estacion: #52ea90; }
:root[data-season='verano']    { --color-estacion: #fdf251; }
:root[data-season='otono']     { --color-estacion: #e8412e; }

:root[data-season]:not([data-theme='dark']) {
  --color-ink: var(--color-estacion);
  --color-canvas: #ffffff;
}

:root[data-theme='dark'][data-season] {
  --color-ink: var(--color-estacion);
  --color-canvas: #000000;
}

/*
 * El amarillo de Verano es muy claro: de día casi no se lee sobre blanco. Ahí
 * el texto queda en negro en vez del amarillo.
 */
:root[data-season='verano']:not([data-theme='dark']) {
  --color-ink: #000000;
}
```

- [ ] **Step 2: Agregar el estilo del label de estación/momento**

Junto a `.catalog-theme-toggle-sep` (buscar en el archivo):

```css
/*
 * Estación y momento del día: texto fijo, no interactivo. Los pinta el reloj
 * (js/utils/reloj.js) según la fecha y hora reales de Buenos Aires.
 */
.catalog-theme-label {
  line-height: 1;
}
```

- [ ] **Step 3: Auditar colores hardcodeados en el header/nav**

Run: `grep -nE '#000|#fff|#ffffff|#000000|: *black|: *white' css/styles.css | grep -iE 'catalog-header|catalog-nav|catalog-meta|catalog-sidebar|topbar'`
Para cada acierto dentro de esas reglas, cambiar el literal por `var(--color-ink)` o `var(--color-canvas)` según corresponda (texto → ink, fondo → canvas). Si no hay aciertos, seguir.

- [ ] **Step 4: Correr la suite (sin regresiones)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css
git commit -m "$(printf 'CSS: paleta por estación (data-season) que tiñe todo el sitio\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 4: Script anti-flash del `<head>` (6 páginas)

**Files:**
- Modify: `index.html`, `coleccion.html`, `riegos.html`, `bitacora.html`, `ajustes.html`, `planta.html`

- [ ] **Step 1: En cada página, reemplazar el bloque `<script>` del `<head>`**

De:
```html
  <script>
    try {
      if (localStorage.getItem('tema') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
  </script>
```
a:
```html
  <script>
    // Anti-flash: fija estación y momento del día ANTES del primer paint, con
    // la hora de Buenos Aires. El JS (js/utils/reloj.js) los mantiene al día
    // después. Estaciones por mes (hemisferio sur); cortes fijos: Día 06-18.
    try {
      var zona = 'America/Argentina/Buenos_Aires';
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: zona, month: 'numeric', hour: '2-digit', hour12: false,
      }).formatToParts(new Date()).reduce(function (acc, p) {
        acc[p.type] = p.value; return acc;
      }, {});
      var mes = Number(partes.month);
      var hora = Number(partes.hour) % 24;
      var estaciones = [
        'verano', 'verano', 'otono', 'otono', 'otono', 'invierno',
        'invierno', 'invierno', 'invierno', 'primavera', 'primavera', 'verano',
      ];
      document.documentElement.setAttribute('data-season', estaciones[mes - 1]);
      var tema = hora >= 6 && hora < 18 ? 'light' : 'dark';
      if (tema !== 'light') document.documentElement.setAttribute('data-theme', tema);
    } catch (e) {}
  </script>
```

- [ ] **Step 2: Verificar que ninguna página quedó con el script viejo**

Run: `grep -rn "localStorage.getItem('tema')" *.html`
Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add index.html coleccion.html riegos.html bitacora.html ajustes.html planta.html
git commit -m "$(printf 'Anti-flash: fijar estación y día/noche por hora de Buenos Aires\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 5: Navbar y sidebar — `.catalog-meta` (5 páginas)

**Files:**
- Modify: `index.html`, `coleccion.html`, `riegos.html`, `bitacora.html`, `ajustes.html`

**Interfaces:**
- Consumes: `[data-hora-completa]` lo pinta `wireReloj`; `[data-estacion-tema]` lo pinta `aplicarEstacionTema`; `[data-theme-toggle]` (ahora `<span>`) lo pinta `aplicarMomentoTema`.

- [ ] **Step 1: En `.catalog-meta`, reemplazar el `<p>` de la hora**

De (las variantes tienen el mismo `<p>` con reloj + toggle; en `index.html` el `<p>` no tiene el toggle, que está aparte — ver Step 2):
```html
      <p>
        Buenos Aires, ARG <time data-reloj>23:46</time>
        <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
        <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
      </p>
```
a:
```html
      <p><time data-hora-completa>00:00 AR 01 ENE 2026</time></p>
      <p>
        <span class="catalog-theme-label" data-estacion-tema>Invierno</span>
        <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
        <span class="catalog-theme-label" data-theme-toggle>Noche</span>
      </p>
```

En `index.html`, el `<p>` de la hora es:
```html
      <p>
        Buenos Aires, ARG <time data-reloj>23:46</time>
        <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
        <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
      </p>
```
Mismo reemplazo (index tiene el mismo patrón dentro de `.catalog-meta`).

- [ ] **Step 2: Sidebar — `.catalog-sidebar-datetime` y `.catalog-sidebar-top` (5 páginas)**

`.catalog-sidebar-datetime`, de:
```html
    <p class="catalog-sidebar-datetime">Buenos Aires, ARG <time data-reloj>23:46</time></p>
```
a:
```html
    <p class="catalog-sidebar-datetime"><time data-hora-completa>00:00 AR 01 ENE 2026</time></p>
```

`.catalog-sidebar-top`, el `<button ... data-theme-toggle>` (o `catalog-theme-toggle`), de:
```html
      <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
```
a:
```html
      <span class="catalog-theme-label" data-estacion-tema>Invierno</span>
      <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
      <span class="catalog-theme-label" data-theme-toggle>Noche</span>
```

- [ ] **Step 3: Verificar que no quedan `[data-reloj]` ni botones de toggle**

Run: `grep -rn "data-reloj\|catalog-theme-toggle\b" index.html coleccion.html riegos.html bitacora.html ajustes.html`
Expected: sin resultados (`catalog-theme-toggle-sep` sí puede aparecer — el `\b` lo excluye).

- [ ] **Step 4: Verificación manual**

`preview_start` (bitacora-plantas-static), abrir `http://localhost:4174/index.html`:
- El reloj dice `"HH:MM AR DD MMM AAAA"`.
- Debajo, `Estación · Día|Noche`.
- El texto del sitio toma el color de la estación actual.
- Consola sin errores.
- En consola: `document.documentElement.setAttribute('data-season','otono')` y `...('data-theme','dark')` → el sitio se tiñe rojo sobre negro. Probar las 4 estaciones.

- [ ] **Step 5: Commit**

```bash
git add index.html coleccion.html riegos.html bitacora.html ajustes.html
git commit -m "$(printf 'Navbar: reloj "HH:MM AR DD MMM AAAA" y estación/momento como texto\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

### Task 6: `planta.html` (topbar) + `planta.js`

**Files:**
- Modify: `planta.html`, `js/pages/planta.js`

- [ ] **Step 1: `planta.html` — topbar**

De:
```html
    <div style="display:flex; align-items:center; gap: var(--space-4);">
      <button type="button" class="catalog-theme-toggle" data-theme-toggle aria-pressed="false">Noche</button>
      <a class="btn btn-secondary" href="dashboard.html">Volver</a>
    </div>
```
a:
```html
    <div style="display:flex; align-items:center; gap: var(--space-4);">
      <time class="catalog-theme-label" data-hora-completa>00:00 AR 01 ENE 2026</time>
      <span class="catalog-theme-label" data-estacion-tema>Invierno</span>
      <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
      <span class="catalog-theme-label" data-theme-toggle>Noche</span>
      <a class="btn btn-secondary" href="dashboard.html">Volver</a>
    </div>
```

- [ ] **Step 2: `js/pages/planta.js` — montar el reloj**

Agregar el import y la llamada junto a `wireThemeToggle()` (línea ~6 y ~196):

```js
import { wireReloj } from '../utils/reloj.js';
```
y donde está `wireThemeToggle();`:
```js
wireReloj();
wireThemeToggle();
```

- [ ] **Step 3: Verificación**

Run: `node --check js/pages/planta.js && npm test`
Expected: parseo OK, 47+ tests en verde.
Abrir `http://localhost:4174/planta.html?id=<uuid>` (o sin id, ver el topbar): el topbar muestra la hora completa y la estación, con el color de la estación.

- [ ] **Step 4: Commit**

```bash
git add planta.html js/pages/planta.js
git commit -m "$(printf 'planta.html: topbar con reloj completo y estación\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-Review

**1. Spec coverage:**
- `theme.js` automático (momentoActual, aplicarMomentoTema, sin toggle/localStorage) → Task 1. ✓
- `reloj.js` (formatearHoraCompleta, estacionActualTema, wireReloj re-aplica temas) → Task 2. ✓
- `catalog-season-theme.js` nuevo (aplicarEstacionTema, wireSeasonTheme) → Task 2. ✓
- Tests portados → Tasks 1 y 2. ✓
- CSS `:root[data-season]` + `.catalog-theme-label` + audit hardcode → Task 3. ✓
- Head anti-flash en 6 páginas → Task 4. ✓
- Navbar `.catalog-meta` + sidebar en 5 páginas → Task 5. ✓
- `planta.html` topbar + `planta.js` wireReloj → Task 6. ✓
- Cambio instantáneo sin transición → Task 3 (no se agrega `transition`). ✓

**2. Placeholder scan:** sin "TBD"/"TODO". Task 3 Step 3 y Task 5 Step 1 contemplan explícitamente el caso "sin aciertos / mismo patrón".

**3. Type consistency:**
- `aplicarEstacionTema` / `aplicarMomentoTema` — firmas `(date) -> string` usadas igual en `wireReloj` (Task 2).
- `wireThemeToggle` conserva nombre y firma `() -> void`; los imports de las páginas no cambian (salvo `planta.js` que suma `wireReloj`).
- `estacionActualTema` vive en `reloj.js` y lo importa `catalog-season-theme.js` — import circular declarado, soportado por ESM.
- `[data-hora-completa]`, `[data-estacion-tema]`, `[data-theme-toggle]` — mismos selectores en JS (Tasks 1–2) y markup (Tasks 5–6).
