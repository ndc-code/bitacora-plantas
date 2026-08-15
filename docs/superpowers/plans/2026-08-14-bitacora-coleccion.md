# Bitácora por planta de Colección Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada planta de Colección abre un diario propio (`bitacora.html?id={uuid}`) para registrar cuidados y ver cuántos días faltan para regar, sin tocar la ficha de la card ni `planta.html`.

**Architecture:** La card gana un renglón `Bitácora / Ver` que apunta al uuid de `user_collection`. La página nueva reutiliza el chrome de Colección. Los eventos viven en `coleccion_cuidados` (no en `cuidados`/`plantas`). La frecuencia de riego se parsea del texto del catálogo (`Cada 10 días`) y el próximo riego se calcula con `calcularProximoVencimiento`.

**Tech Stack:** HTML/CSS/JS plano, supabase-js vía CDN, Postgres (migración SQL), `node --test` para utils.

**Spec:** `docs/superpowers/specs/2026-08-14-bitacora-coleccion-design.md`

## Global Constraints

- No modificar `planta.html`, `js/pages/planta.js` ni `js/services/cuidados.js`.
- `js/pages/coleccion.js` no gana lógica nueva: el link vive en el markup de la card.
- Identidad del diario = `user_collection.id` (uuid), no `planta_id` del catálogo.
- Frecuencia = parseo de `Cada N días` de la estación actual; sin formulario de “cada cuántos días”.
- `user_collection.ultimoriego` no se lee ni se escribe para este feature.
- UI de tipos: Regar, Fertilizar, Trasplantar, Podar. No exponer `otro`.
- Errores inline, sin `alert()`.
- `npm test` = `node --test "js/utils/*.test.js"`.
- Commits solo si el usuario los pide en la sesión de ejecución; los pasos de commit son opcionales.

## File map

| Archivo | Responsabilidad |
| --- | --- |
| `js/utils/riego-frecuencia.js` | `diasDeRiego`, `textoProximoRiego`, `formatFechaCorta` |
| `js/utils/riego-frecuencia.test.js` | Tests de parseo y copy |
| `js/utils/coleccion-card.js` | Fila Bitácora / Ver |
| `js/utils/coleccion-card.test.js` | Markup del link y orden respecto de Eliminar |
| `css/styles.css` | Link de la card + layout de `bitacora.html` |
| `supabase/migrations/0002_coleccion_bitacora.sql` | `created_at`, tabla, índice, RLS |
| `js/services/coleccion.js` | `obtenerItemColeccion(id)` |
| `js/services/coleccion-cuidados.js` | Listar y registrar eventos |
| `bitacora.html` | Chrome + zonas Estado / Registrar / Historial |
| `js/pages/bitacora.js` | Sesión, carga, formulario, render |

---

### Task 1: Parseo de riego y copy de “En / Hoy / Hace”

**Files:**
- Create: `js/utils/riego-frecuencia.test.js`
- Create: `js/utils/riego-frecuencia.js`

**Interfaces:**
- Consumes: `calcularProximoVencimiento` de `js/utils/recordatorios.js` (no se llama acá; lo usa la página). `textoProximoRiego` solo formatea una fecha ya calculada.
- Produces:
  - `diasDeRiego(texto: string): number | null`
  - `textoProximoRiego(proximaFecha: Date | string | null, ahora?: Date): string | null`
  - `formatFechaCorta(valor: Date | string): string` — `12 ago 2026`. Strings `YYYY-MM-DD` se interpretan como medianoche local.

- [ ] **Step 1: Write the failing test**

Crear `js/utils/riego-frecuencia.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/utils/riego-frecuencia.test.js`

Expected: FAIL con `Cannot find module` o `diasDeRiego is not a function`.

- [ ] **Step 3: Write minimal implementation**

Crear `js/utils/riego-frecuencia.js`:

```js
const DIA_MS = 1000 * 60 * 60 * 24;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaComoLocal(valor) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00`);
  }
  return new Date(valor);
}

function inicioDiaLocal(fecha) {
  const d = fechaComoLocal(fecha);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function diasDeRiego(texto) {
  if (typeof texto !== 'string') return null;
  const match = texto.trim().match(/^Cada (\d+) días$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function textoProximoRiego(proximaFecha, ahora = new Date()) {
  if (proximaFecha == null) return null;
  const dias = Math.round(
    (inicioDiaLocal(proximaFecha).getTime() - inicioDiaLocal(ahora).getTime()) / DIA_MS
  );
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'En 1 día';
  if (dias > 1) return `En ${dias} días`;
  if (dias === -1) return 'Hace 1 día';
  return `Hace ${Math.abs(dias)} días`;
}

export function formatFechaCorta(valor) {
  const d = fechaComoLocal(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `node --test js/utils/riego-frecuencia.test.js`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit (opcional)**

```bash
git add js/utils/riego-frecuencia.js js/utils/riego-frecuencia.test.js
git commit -m "$(cat <<'EOF'
Add watering frequency parse and next-water copy helpers.

EOF
)"
```

---

### Task 2: Renglón Bitácora / Ver en la card

**Files:**
- Modify: `js/utils/coleccion-card.test.js`
- Modify: `js/utils/coleccion-card.js`
- Modify: `css/styles.css` (reglas de `.coleccion-card-facts` y `.coleccion-eliminar-btn`)

**Interfaces:**
- Consumes: `escapeHtml`, `idDeColeccion(planta)` sin cambios (`planta_id || id`).
- Produces: `entryMarkup(planta)` incluye, **antes** de la fila Eliminar, una fila `Bitácora`. Si `planta.id` (uuid de `user_collection`) existe, el valor es `<a class="coleccion-bitacora-link" href="bitacora.html?id={uuid}" aria-label="Ver bitácora de {nombre}">Ver</a>`. Si no hay `id`, el valor es `—` (sin link).

- [ ] **Step 1: Write the failing test**

Agregar al final de `js/utils/coleccion-card.test.js`:

```js
function plantaCard(extra = {}) {
  return {
    nombre: 'Aglaonema',
    especie: 'Aglaonema commutatum',
    ubicacion: 'Sombra',
    luz: 'Baja',
    suelo: 'Franco',
    cuidado: 'Fácil',
    riego: 'Cada 10 días',
    ...extra,
  };
}

test('encima de Eliminar va Bitácora con link al uuid de la fila', () => {
  const html = entryMarkup(plantaCard({ id: '11111111-1111-4111-8111-111111111111' }));
  const filas = lis(html);
  const iBitacora = filas.findIndex((li) => /<span>Bitácora<\/span>/.test(li));
  const iEliminar = filas.findIndex((li) => /coleccion-eliminar-btn/.test(li));

  assert.ok(iBitacora >= 0);
  assert.ok(iEliminar >= 0);
  assert.equal(iBitacora, iEliminar - 1);
  assert.match(
    filas[iBitacora],
    /href="bitacora.html\?id=11111111-1111-4111-8111-111111111111"/
  );
  assert.match(filas[iBitacora], /class="coleccion-bitacora-link"/);
  assert.match(filas[iBitacora], /aria-label="Ver bitácora de Aglaonema"/);
  assert.match(filas[iBitacora], />Ver</);
});

test('sin id de fila, Bitácora no arma link', () => {
  const html = entryMarkup(plantaCard());
  assert.match(html, /<span>Bitácora<\/span>/);
  assert.doesNotMatch(html, /coleccion-bitacora-link/);
  assert.doesNotMatch(html, /bitacora.html/);
});

test('Eliminar sigue usando planta_id y no el uuid de Bitácora', () => {
  const html = entryMarkup(
    plantaCard({
      id: '11111111-1111-4111-8111-111111111111',
      planta_id: 'aglaonema::aglaonema commutatum::sombra',
    })
  );
  assert.match(html, /data-id="aglaonema::aglaonema commutatum::sombra"/);
  assert.match(html, /href="bitacora.html\?id=11111111-1111-4111-8111-111111111111"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/utils/coleccion-card.test.js`

Expected: FAIL — no hay fila Bitácora.

- [ ] **Step 3: Write minimal implementation**

En `js/utils/coleccion-card.js`, agregar helper y la fila **arriba** de Colección/Eliminar:

```js
function bitacoraCell(planta) {
  if (!planta.id) return '<span>—</span>';
  const nombre = escapeHtml(planta.nombre);
  const id = escapeHtml(planta.id);
  return `<a class="coleccion-bitacora-link" href="bitacora.html?id=${id}" aria-label="Ver bitácora de ${nombre}">Ver</a>`;
}
```

Dentro de `entryMarkup`, antes del `<li>` de Colección/Eliminar:

```html
<li><span>Bitácora</span>${bitacoraCell(planta)}</li>
```

En `css/styles.css`, extender la regla de alineación derecha y estilar el link como el resto de valores (no como botón negro):

```css
.coleccion-card-facts li span:last-child,
.coleccion-card-facts li h2,
.coleccion-card-facts li .coleccion-bitacora-link {
  margin: 0;
  font: inherit;
  font-weight: 400;
  text-align: right;
}

.coleccion-bitacora-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

La regla original `.coleccion-card-facts li span:last-child, .coleccion-card-facts li h2` se reemplaza por la de arriba (no duplicar).

- [ ] **Step 4: Run tests and make sure they pass**

Run: `node --test js/utils/coleccion-card.test.js js/utils/riego-frecuencia.test.js`

Expected: PASS. Los tests viejos de Nombre/Categoría siguen verdes: solo miran `filas[0]` y `filas[1]`.

- [ ] **Step 5: Commit (opcional)**

```bash
git add js/utils/coleccion-card.js js/utils/coleccion-card.test.js css/styles.css
git commit -m "$(cat <<'EOF'
Add Bitácora link on collection cards.

EOF
)"
```

---

### Task 3: Migración `coleccion_cuidados` + `created_at`

**Files:**
- Create: `supabase/migrations/0002_coleccion_bitacora.sql`

**Interfaces:**
- Consumes: enum `public.tipo_cuidado` y tabla `public.user_collection` (ya existen en el proyecto remoto; `user_collection` no está en `0001_init.sql`).
- Produces: columna `user_collection.created_at`; tabla `coleccion_cuidados` con FK `coleccion_id → user_collection.id` ON DELETE CASCADE; índice `(coleccion_id, tipo, fecha desc)`; RLS.

- [ ] **Step 1: Write the migration**

Crear `supabase/migrations/0002_coleccion_bitacora.sql`:

```sql
alter table public.user_collection
  add column if not exists created_at timestamptz not null default now();

create table public.coleccion_cuidados (
  id uuid primary key default gen_random_uuid(),
  coleccion_id uuid not null references public.user_collection (id) on delete cascade,
  tipo public.tipo_cuidado not null,
  fecha timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now()
);

create index coleccion_cuidados_coleccion_tipo_fecha_idx
  on public.coleccion_cuidados (coleccion_id, tipo, fecha desc);

alter table public.coleccion_cuidados enable row level security;

create policy "coleccion_cuidados_owner_all" on public.coleccion_cuidados
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_collection c
      where c.id = coleccion_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.user_collection c
      where c.id = coleccion_id and c.user_id = (select auth.uid())
    )
  );
```

El índice compuesto cubre el FK `coleccion_id` (columna izquierda): listar por planta, último `regar` y el CASCADE al borrar de Colección no hacen seq scan.

Las filas de `user_collection` que no tenían `created_at` quedan con el timestamp de la migración. Es el compromiso de este corte.

- [ ] **Step 2: Apply the migration on the remote project**

Este repo no tiene `supabase/config.toml`. Correr el SQL en el SQL Editor del proyecto Supabase (`ehtqmxtleaclzljaizjy`), o con CLI si está linkeado:

```bash
npx supabase db query --linked -f supabase/migrations/0002_coleccion_bitacora.sql
```

Expected: la tabla `coleccion_cuidados` aparece en Table Editor; `user_collection` tiene `created_at`.

- [ ] **Step 3: Commit (opcional)**

```bash
git add supabase/migrations/0002_coleccion_bitacora.sql
git commit -m "$(cat <<'EOF'
Add collection care log table and created_at.

EOF
)"
```

---

### Task 4: Servicios de colección y cuidados

**Files:**
- Modify: `js/services/coleccion.js` (agregar `obtenerItemColeccion` al final, antes de `idDesdePlanta` o después de `quitarDeColeccion`)
- Create: `js/services/coleccion-cuidados.js`

**Interfaces:**
- Consumes: `supabase`, `getSession()`.
- Produces:
  - `obtenerItemColeccion(id: string): Promise<object | null>` — `select('*')` de `user_collection` filtrando `id` y `user_id`. `null` si no hay fila (id inválido o de otra persona). Lanza si hay error de red/PostgREST.
  - `listarCuidadosColeccion(coleccionId: string): Promise<Cuidado[]>` — orden `fecha` descending.
  - `registrarCuidadoColeccion(coleccionId: string, tipo: string, fecha: string, notas: string | null): Promise<Cuidado>`
  - `Cuidado = { id, coleccion_id, tipo, fecha, notas, created_at }`

Sin tests automatizados (dependen de Supabase), igual que `js/services/cuidados.js`.

- [ ] **Step 1: Add `obtenerItemColeccion` to `js/services/coleccion.js`**

```js
export async function obtenerItemColeccion(id) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('user_collection')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

Usar `.maybeSingle()` y no `.single()`: “no hay fila” tiene que ser `null` (mensaje de la página), no un throw.

- [ ] **Step 2: Create `js/services/coleccion-cuidados.js`**

```js
import { supabase } from '../config.js';

export async function listarCuidadosColeccion(coleccionId) {
  const { data, error } = await supabase
    .from('coleccion_cuidados')
    .select('*')
    .eq('coleccion_id', coleccionId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function registrarCuidadoColeccion(coleccionId, tipo, fecha, notas) {
  const { data, error } = await supabase
    .from('coleccion_cuidados')
    .insert({ coleccion_id: coleccionId, tipo, fecha, notas })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Commit (opcional)**

```bash
git add js/services/coleccion.js js/services/coleccion-cuidados.js
git commit -m "$(cat <<'EOF'
Add collection item lookup and care log service.

EOF
)"
```

---

### Task 5: Página `bitacora.html` (chrome + zonas)

**Files:**
- Create: `bitacora.html`
- Modify: `css/styles.css` (bloque al final)

**Interfaces:**
- Consumes: mismas clases de chrome que `coleccion.html` (`.catalog-page`, header, sidebar, modal de auth). Sin filtros.
- Produces: markup con ids que Task 6 cablea: `#bitacora-contenido`, `#mensaje-sesion`, `#mensaje-faltante`, `#bitacora-nombre`, `#bitacora-foto`, `#bitacora-estado`, `#form-cuidado`, `#tipo-cuidado`, `#fecha-cuidado`, `#notas-cuidado`, `#error-cuidado`, `#lista-bitacora`, `#error-pagina`.

- [ ] **Step 1: Create `bitacora.html`**

Copiar el chrome de `coleccion.html` (header, sidebar, modal, scripts de supabase) con estos cambios:

- `<title>Bitácora — Bitácora de Plantas</title>`
- `body` class: `catalog-page catalog-page--coleccion catalog-page--bitacora`
- Header left: `Diario de cuidados de esta planta: riegos y notas a lo largo del tiempo.`
- Nav: Colección sigue `is-active` (Index no). Mismos spans de count `#coleccion-count` / `#sidebar-coleccion-count`.
- En el lugar del botón Filtros, un link:

```html
<a class="bitacora-volver" href="coleccion.html">Volver</a>
```

- Sin `#catalog-filters-toggle`, sin sección de filtros.
- Script: `js/pages/bitacora.js` (aunque todavía no exista: Task 6 lo crea; si se abre la página a mitad de camino, el 404 de módulo es esperado).

Main:

```html
<p class="field-error" id="error-pagina" hidden></p>

<p id="mensaje-sesion" class="catalog-empty" hidden>
  Iniciá sesión para ver la bitácora de esta planta.
</p>
<p id="mensaje-faltante" class="catalog-empty" hidden>
  No encontramos esa planta. <a href="coleccion.html">Volver a Colección</a>
</p>

<div id="bitacora-contenido" hidden>
  <header class="bitacora-heading">
    <figure class="bitacora-foto" id="bitacora-foto"></figure>
    <div>
      <p class="bitacora-kicker"><a href="coleccion.html">Colección</a></p>
      <h1 id="bitacora-nombre"></h1>
    </div>
  </header>

  <ul class="coleccion-card-facts" id="bitacora-estado"></ul>

  <h2 class="bitacora-section-title">Registrar</h2>
  <form id="form-cuidado">
    <div class="field">
      <label for="tipo-cuidado">Tipo</label>
      <select class="input" id="tipo-cuidado">
        <option value="regar" selected>Regar</option>
        <option value="fertilizar">Fertilizar</option>
        <option value="trasplantar">Trasplantar</option>
        <option value="podar">Podar</option>
      </select>
    </div>
    <div class="field">
      <label for="fecha-cuidado">Fecha</label>
      <input class="input" type="date" id="fecha-cuidado" required />
    </div>
    <div class="field">
      <label for="notas-cuidado">Notas</label>
      <input class="input" id="notas-cuidado" />
    </div>
    <p class="field-error" id="error-cuidado" hidden></p>
    <button type="submit" class="btn btn-primary">Registrar</button>
  </form>

  <h2 class="bitacora-section-title">Historial</h2>
  <ul id="lista-bitacora" class="bitacora-historial"></ul>
</div>
```

El modal `#dialog-auth` se copia igual que en `coleccion.html`.

- [ ] **Step 2: Add CSS for the page**

Al final de `css/styles.css`:

```css
.bitacora-volver {
  grid-column: 6;
  justify-self: start;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.catalog-page--bitacora .catalog-list,
.bitacora-heading,
#bitacora-contenido,
#mensaje-sesion,
#mensaje-faltante {
  padding-left: var(--catalog-inline);
  padding-right: var(--catalog-inline);
}

#bitacora-contenido {
  max-width: 720px;
  padding-bottom: var(--space-15);
}

.bitacora-heading {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: var(--space-5);
  align-items: end;
  margin: var(--space-8) 0 var(--space-6);
  padding-left: 0;
  padding-right: 0;
}

.bitacora-foto {
  margin: 0;
  width: 96px;
  height: 96px;
  overflow: hidden;
  background: var(--color-border);
}

.bitacora-foto img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bitacora-kicker {
  margin: 0 0 var(--space-2);
  font-size: 14px;
}

.bitacora-kicker a {
  color: inherit;
}

#bitacora-nombre {
  margin: 0;
  font-size: 32px;
  font-weight: 400;
  line-height: 1.15;
}

.bitacora-section-title {
  margin: var(--space-10) 0 var(--space-4);
  font-size: 20px;
  font-weight: 400;
}

.bitacora-historial {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bitacora-historial li {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-black);
  font-size: 14px;
}

.bitacora-historial li p {
  margin: var(--space-2) 0 0;
}

@media (max-width: 799px) {
  .bitacora-volver,
  .catalog-page--bitacora .catalog-list,
  .bitacora-heading,
  #bitacora-contenido,
  #mensaje-sesion,
  #mensaje-faltante {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }

  .bitacora-volver {
    grid-column: 1;
  }
}
```

- [ ] **Step 3: Commit (opcional)**

```bash
git add bitacora.html css/styles.css
git commit -m "$(cat <<'EOF'
Add bitácora page chrome and layout.

EOF
)"
```

---

### Task 6: Cablear `bitacora.js`

**Files:**
- Create: `js/pages/bitacora.js`

**Interfaces:**
- Consumes:
  - `obtenerItemColeccion(id)` → `object | null`
  - `listarCuidadosColeccion(coleccionId)` → `Cuidado[]`
  - `registrarCuidadoColeccion(coleccionId, tipo, fecha, notas)` → `Cuidado`
  - `diasDeRiego(texto)`, `textoProximoRiego(fecha, ahora)`, `formatFechaCorta(valor)`
  - `calcularProximoVencimiento({ ultimaFecha, fechaAlta, frecuenciaDias })`
  - `riegosDePlanta`, `estacionActual`, `riegoParaEstacion`
  - `wireReloj`, `wireAuthNav`, `wireAuthModal`, `syncColeccionNavCount`
  - `qs`, `escapeHtml`, `showError`, `clearError`, `iniciarPagina`
- Produces: página funcional según el spec (estado, registrar, historial, sesión).

- [ ] **Step 1: Create `js/pages/bitacora.js`**

```js
import { qs, escapeHtml, showError, clearError } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { obtenerItemColeccion } from '../services/coleccion.js';
import {
  listarCuidadosColeccion,
  registrarCuidadoColeccion,
} from '../services/coleccion-cuidados.js';
import { riegosDePlanta } from '../utils/coleccion-card.js';
import { estacionActual, riegoParaEstacion } from '../utils/catalog-riego-estacion.js';
import { calcularProximoVencimiento } from '../utils/recordatorios.js';
import { diasDeRiego, textoProximoRiego, formatFechaCorta } from '../utils/riego-frecuencia.js';
import { syncColeccionNavCount } from '../utils/coleccion-nav.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { iniciarPagina } from '../utils/guard.js';

const ETIQUETAS_TIPO = {
  regar: 'Regar',
  fertilizar: 'Fertilizar',
  trasplantar: 'Trasplantar',
  podar: 'Podar',
  otro: 'Otro',
};

const coleccionId = new URLSearchParams(window.location.search).get('id');

function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaInputAISO(valor) {
  return new Date(`${valor}T00:00:00`).toISOString();
}

function ponerFechaDeHoy() {
  qs('#fecha-cuidado').value = fechaLocalISO();
}

function toggleSidebar() {
  const sidebar = qs('#catalog-sidebar');
  const toggle = qs('#catalog-menu-toggle');
  if (!sidebar || !toggle) return;
  const isOpen = sidebar.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', isOpen);
  document.body.classList.toggle('sidebar-open', isOpen);
}

function closeSidebar() {
  const sidebar = qs('#catalog-sidebar');
  const toggle = qs('#catalog-menu-toggle');
  if (!sidebar || !toggle) return;
  sidebar.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sidebar-open');
}

function wireSidebarToggle() {
  const toggle = qs('#catalog-menu-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', toggleSidebar);
  qs('#catalog-sidebar-close')?.addEventListener('click', closeSidebar);
  document.body.addEventListener('click', (event) => {
    const sidebar = qs('#catalog-sidebar');
    if (
      sidebar &&
      sidebar.classList.contains('is-open') &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeSidebar();
    }
  });
}

function ultimoRiegoDe(eventos) {
  return eventos.find((evento) => evento.tipo === 'regar') ?? null;
}

function renderFoto(planta) {
  const imagen = planta.imagen || (Array.isArray(planta.galeria) ? planta.galeria[0] : '');
  qs('#bitacora-foto').innerHTML = imagen
    ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(planta.nombre)}" width="96" height="96" />`
    : '';
}

function renderEstado(planta, eventos) {
  const riego = riegoParaEstacion(riegosDePlanta(planta), planta.riego, estacionActual());
  const frecuenciaDias = diasDeRiego(riego);
  const ultimo = ultimoRiegoDe(eventos);
  const proxima = calcularProximoVencimiento({
    ultimaFecha: ultimo?.fecha ?? null,
    fechaAlta: planta.created_at,
    frecuenciaDias,
  });
  const textoProximo = frecuenciaDias == null ? null : textoProximoRiego(proxima);

  qs('#bitacora-estado').innerHTML = `
    <li><span>En colección</span><span>${escapeHtml(formatFechaCorta(planta.created_at))}</span></li>
    <li><span>Último riego</span><span>${ultimo ? escapeHtml(formatFechaCorta(ultimo.fecha)) : 'Sin registrar'}</span></li>
    <li><span>Próximo riego</span><span>${escapeHtml(textoProximo ?? '—')}</span></li>
  `;
}

function renderHistorial(eventos) {
  const lista = qs('#lista-bitacora');
  if (!eventos.length) {
    lista.innerHTML = '<li>Todavía no hay registros.</li>';
    return;
  }
  lista.innerHTML = eventos
    .map(
      (evento) => `
        <li>
          <strong>${escapeHtml(ETIQUETAS_TIPO[evento.tipo] || evento.tipo)}</strong>
          — ${escapeHtml(formatFechaCorta(evento.fecha))}
          ${evento.notas ? `<p>${escapeHtml(evento.notas)}</p>` : ''}
        </li>
      `
    )
    .join('');
}

function mostrarSolo(idVisible) {
  qs('#mensaje-sesion').hidden = idVisible !== 'mensaje-sesion';
  qs('#mensaje-faltante').hidden = idVisible !== 'mensaje-faltante';
  qs('#bitacora-contenido').hidden = idVisible !== 'bitacora-contenido';
}

async function pintarBitacora(planta) {
  const eventos = await listarCuidadosColeccion(planta.id);
  renderFoto(planta);
  qs('#bitacora-nombre').textContent = planta.nombre || '';
  document.title = `${planta.nombre || 'Bitácora'} — Bitácora de Plantas`;
  renderEstado(planta, eventos);
  renderHistorial(eventos);
}

function wireFormCuidado(planta) {
  const form = qs('#form-cuidado');
  const errorEl = qs('#error-cuidado');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    if (!(await getSession())) {
      showError(errorEl, 'Iniciá sesión para registrar un cuidado.');
      authNav.sync();
      authModal.open({
        onSuccess: async () => {
          await authNav.sync();
          clearError(errorEl);
        },
      });
      return;
    }

    const tipo = qs('#tipo-cuidado').value;
    const fecha = qs('#fecha-cuidado').value;
    const notas = qs('#notas-cuidado').value || null;

    try {
      await registrarCuidadoColeccion(planta.id, tipo, fechaInputAISO(fecha), notas);
      form.reset();
      qs('#tipo-cuidado').value = 'regar';
      ponerFechaDeHoy();
      await pintarBitacora(planta);
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

async function cargarPlanta() {
  if (!coleccionId) {
    mostrarSolo('mensaje-faltante');
    return null;
  }

  let planta;
  try {
    planta = await obtenerItemColeccion(coleccionId);
  } catch (err) {
    console.error('No se pudo cargar la planta', err);
    mostrarSolo('mensaje-faltante');
    return null;
  }

  if (!planta) {
    mostrarSolo('mensaje-faltante');
    return null;
  }

  mostrarSolo('bitacora-contenido');
  await pintarBitacora(planta);
  return planta;
}

const authModal = wireAuthModal();
const authNav = wireAuthNav({
  onLogin: () => {
    authModal.open({
      onSuccess: async () => {
        await authNav.sync();
        const planta = await cargarPlanta();
        if (planta && !qs('#form-cuidado').dataset.wired) {
          qs('#form-cuidado').dataset.wired = '1';
          wireFormCuidado(planta);
          ponerFechaDeHoy();
        }
      },
    });
  },
});

iniciarPagina(async function init() {
  wireReloj();
  wireSidebarToggle();
  await authNav.sync();
  await syncColeccionNavCount();

  if (!(await getSession())) {
    mostrarSolo('mensaje-sesion');
    return;
  }

  const planta = await cargarPlanta();
  if (!planta) return;
  wireFormCuidado(planta);
  ponerFechaDeHoy();
});
```

No leer `planta.ultimoriego`. El último riego sale solo de `coleccion_cuidados`.

- [ ] **Step 2: Run unit tests (no deben romperse)**

Run: `npm test`

Expected: PASS. `riego-frecuencia` y `coleccion-card` siguen verdes.

- [ ] **Step 3: Manual verification**

1. Agregar una planta a Colección → aparece `Bitácora / Ver` encima de Eliminar.
2. Entrar → En colección tiene fecha; último riego `Sin registrar`; próximo riego cuenta desde la fecha de alta + N del catálogo.
3. Registrar un riego en hoy → último riego = hoy; próximo = hoy + N; el historial muestra el evento.
4. Registrar fertilizar → “Último riego” no cambia; el historial sí suma la fila.
5. Volver a Colección → la ficha (luz, suelo, riego, etc.) sigue igual.
6. Eliminar la planta → `bitacora.html?id=…` de esa fila muestra “No encontramos esa planta.”
7. Sin sesión, abrir `bitacora.html?id=…` → pide login; tras entrar, si el id es de esa cuenta, se ve el diario.
8. Registrar sin fecha → el browser bloquea el submit (`required`).
9. Click en `Ver` no elimina la planta.

- [ ] **Step 4: Commit (opcional)**

```bash
git add js/pages/bitacora.js bitacora.html css/styles.css
git commit -m "$(cat <<'EOF'
Wire collection plant care log page.

EOF
)"
```
