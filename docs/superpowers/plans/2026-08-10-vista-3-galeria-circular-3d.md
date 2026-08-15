# Vista 3 — Galería circular 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el layout "spotlight" de la vista 3 del catálogo (`data-view="3"`) por una galería circular 3D (anillo de imágenes en perspectiva, rotación por scroll, tilt por mouse, preview grande al hover), reutilizando las imágenes reales de las 150 plantas del catálogo.

**Architecture:** Un módulo JS nuevo (`js/utils/catalog-gallery-3d.js`) lee las `.catalog-entry` ya presentes en el DOM (generadas por `scripts/generate-catalog-rows.mjs`, no se tocan), construye un anillo de `.catalog-gallery-3d-item` dentro de un contenedor nuevo (`#catalog-gallery-3d`, hermano de `#catalog-rows`), y usa GSAP + ScrollTrigger (cargados por `<script>` CDN, sin paquete npm) para animar rotación y hover. `catalog-view.js` decide qué contenedor mostrar según la vista activa y dispara la construcción perezosa del anillo la primera vez que se entra a vista 3. El cálculo de ángulos por ítem y la extracción de datos de plantas desde el DOM se separan en funciones puras testeables con `node --test`; el wiring de GSAP/ScrollTrigger/eventos de mouse no se testea automáticamente (no hay entorno DOM en el test runner) y se verifica manualmente en navegador.

**Tech Stack:** HTML/CSS/JS vanilla (ES modules), GSAP 3 + ScrollTrigger vía CDN (`cdnjs`, sin instalación npm), `node --test` para las funciones puras.

## Global Constraints

- GSAP y ScrollTrigger se cargan **solo vía CDN** (`<script src="https://cdnjs.cloudflare.com/...">`), nunca como dependencia npm — no tocar `package.json`.
- No modificar el HTML generado entre `<!-- catalog-rows:start -->` y `<!-- catalog-rows:end -->` en `index.html` (lo regenera `scripts/generate-catalog-rows.mjs`); el contenedor nuevo va fuera de esos marcadores.
- Reutilizar las imágenes ya presentes en el DOM (`data-imagen` en `.catalog-add`, o el `<img>` de `.catalog-tile-media`) — no agregar URLs de imágenes nuevas ni los assets estáticos de `cg-3d-circular-img-gallery/assets`.
- Respetar `prefers-reduced-motion: reduce` (patrón ya usado en el resto de `css/styles.css` y en `catalog-view.js`/otros módulos): sin animación de scroll/mouse cuando está activo, anillo estático.
- Sin interacción de mouse-tilt en touch/mobile (no hay evento `mousemove` real); en `max-width: 799px` la galería se reduce y solo rota con scroll.
- Namespace de clases CSS nuevas: `catalog-gallery-3d-*` (sigue la convención `catalog-*` ya usada en el archivo).
- Eliminar `#mensaje-view-3` y su referencia en `catalog-view.js` (placeholder muerto, vista 3 deja de estar "sin definir").

---

## File Structure

- **Modify `index.html`**: quitar `#mensaje-view-3`; agregar el contenedor `#catalog-gallery-3d` (hermano de `#catalog-rows`, fuera de los marcadores de filas); agregar `<script>` de GSAP + ScrollTrigger vía CDN con `defer`, antes del script de página.
- **Create `js/utils/catalog-gallery-3d.js`**: lógica de la galería 3D. Exporta:
  - `angleForIndex(index, total)` — función pura, calcula el ángulo de un ítem en el anillo.
  - `extraerPlantasDelDom(root)` — función pura (dado un root `Element`/`Document`), lee `.catalog-entry` y devuelve `{ nombre, imagen }[]`.
  - `buildGallery3D(options)` — construye el DOM del anillo (usa las dos funciones anteriores) y engancha GSAP/ScrollTrigger/eventos. Idempotente (no reconstruye si ya se construyó).
  - `wireCatalogGallery3D()` — punto de entrada usado por `catalog-view.js`.
- **Create `js/utils/catalog-gallery-3d.test.js`**: tests de `node --test` para `angleForIndex` y `extraerPlantasDelDom` (usando un `DOMParser`-like fake mínimo o construyendo objetos planos, ver Task 2).
- **Modify `js/utils/catalog-view.js`**: al aplicar vista `'3'`, mostrar `#catalog-gallery-3d` y ocultar `#catalog-rows` (y viceversa para 1/2); llamar a `buildGallery3D()` la primera vez que se activa vista 3; quitar el manejo de `#mensaje-view-3`.
- **Modify `css/styles.css`**: eliminar el bloque `.catalog-spotlight*` / `.catalog-page[data-view='3'] ...` actual (líneas ~735–855) y agregar las reglas `catalog-gallery-3d-*` (contenedor, anillo, ítems, preview, responsive, `prefers-reduced-motion`).

---

## Task 1: Contenedor HTML y carga de GSAP vía CDN

**Files:**
- Modify: `index.html:114-116` (quitar `#mensaje-view-3`, agregar `#catalog-gallery-3d`)
- Modify: `index.html` (agregar scripts CDN antes de `js/pages/index.js`)

**Interfaces:**
- Produce: el elemento `#catalog-gallery-3d` con la estructura interna que `catalog-gallery-3d.js` (Task 2/3) va a rellenar y mostrar/ocultar.

- [ ] **Step 1: Reemplazar el placeholder por el contenedor de la galería 3D**

En `index.html`, reemplazar:

```html
    <p id="mensaje-view-3" class="catalog-empty" hidden>
      Vista 3 todavía no está definida.
    </p>
    <div id="catalog-rows" class="catalog-rows">
```

por:

```html
    <div id="catalog-gallery-3d" class="catalog-gallery-3d" hidden>
      <div class="catalog-gallery-3d-preview">
        <img src="" alt="" />
      </div>
      <div class="catalog-gallery-3d-stage">
        <div class="catalog-gallery-3d-ring"></div>
      </div>
    </div>
    <div id="catalog-rows" class="catalog-rows">
```

- [ ] **Step 2: Agregar los scripts de GSAP + ScrollTrigger vía CDN**

En `index.html`, justo antes de `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` (o inmediatamente antes de `<script type="module" src="js/pages/index.js">`, el que exista en este archivo), agregar:

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.3/gsap.min.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.3/ScrollTrigger.min.js" defer></script>
```

Verificar con `grep -n 'js/pages/index.js\|supabase-js' index.html` que quedan antes del módulo de página, en el mismo orden relativo que ya usa el archivo para sus otros `<script>`.

- [ ] **Step 3: Verificar que la página sigue cargando**

Run: `python3 -m http.server 8000` (desde la raíz del repo) y abrir `http://localhost:8000/index.html` en el navegador.
Expected: la página carga sin errores de consola nuevos; `window.gsap` y `window.ScrollTrigger` están definidos (comprobar en la consola del navegador: `typeof gsap`, `typeof ScrollTrigger` → `"object"`/`"function"`).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add gallery-3d container and load GSAP via CDN"
```

---

## Task 2: Funciones puras — ángulo y extracción de datos del DOM

**Files:**
- Create: `js/utils/catalog-gallery-3d.js` (solo las dos funciones puras por ahora)
- Test: `js/utils/catalog-gallery-3d.test.js`

**Interfaces:**
- Produce: `angleForIndex(index: number, total: number): number` — grados, replica `index * (360 / total) - 90` de la referencia.
- Produce: `extraerPlantasDelDom(root: ParentNode): { nombre: string, imagen: string }[]` — para cada `.catalog-entry` en `root`, toma el nombre desde `.catalog-tile-name` (texto) y la imagen desde el primer `[data-imagen]` encontrado dentro de la entry (`.catalog-add`); descarta entries sin imagen.

- [ ] **Step 1: Escribir los tests (fallando)**

Crear `js/utils/catalog-gallery-3d.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleForIndex, extraerPlantasDelDom } from './catalog-gallery-3d.js';

test('angleForIndex reparte 360 grados entre los ítems, arrancando en -90', () => {
  assert.equal(angleForIndex(0, 4), -90);
  assert.equal(angleForIndex(1, 4), 0);
  assert.equal(angleForIndex(2, 4), 90);
  assert.equal(angleForIndex(3, 4), 180);
});

test('angleForIndex con un solo ítem no divide por cero', () => {
  assert.equal(angleForIndex(0, 1), -90);
});

function fakeEntry(nombre, imagen) {
  return {
    querySelector(selector) {
      if (selector === '.catalog-tile-name') {
        return imagen === null && nombre === null ? null : { textContent: nombre };
      }
      if (selector === '[data-imagen]') {
        return imagen ? { dataset: { imagen } } : null;
      }
      return null;
    },
  };
}

test('extraerPlantasDelDom lee nombre e imagen de cada .catalog-entry', () => {
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.catalog-entry');
      return [
        fakeEntry('Aglaonema', 'https://example.com/a.jpg'),
        fakeEntry('Potus', 'https://example.com/b.jpg'),
      ];
    },
  };
  const plantas = extraerPlantasDelDom(root);
  assert.deepEqual(plantas, [
    { nombre: 'Aglaonema', imagen: 'https://example.com/a.jpg' },
    { nombre: 'Potus', imagen: 'https://example.com/b.jpg' },
  ]);
});

test('extraerPlantasDelDom descarta entries sin imagen', () => {
  const root = {
    querySelectorAll() {
      return [fakeEntry('Sin imagen', null), fakeEntry('Con imagen', 'https://example.com/c.jpg')];
    },
  };
  const plantas = extraerPlantasDelDom(root);
  assert.deepEqual(plantas, [{ nombre: 'Con imagen', imagen: 'https://example.com/c.jpg' }]);
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test js/utils/catalog-gallery-3d.test.js`
Expected: FAIL — `catalog-gallery-3d.js` no existe todavía (error de módulo no encontrado).

- [ ] **Step 3: Implementar las funciones puras**

Crear `js/utils/catalog-gallery-3d.js`:

```javascript
export function angleForIndex(index, total) {
  const angleIncrement = 360 / Math.max(total, 1);
  return index * angleIncrement - 90;
}

export function extraerPlantasDelDom(root) {
  const entries = Array.from(root.querySelectorAll('.catalog-entry'));
  const plantas = [];
  for (const entry of entries) {
    const nombreEl = entry.querySelector('.catalog-tile-name');
    const imagenEl = entry.querySelector('[data-imagen]');
    const imagen = imagenEl?.dataset?.imagen;
    if (!nombreEl || !imagen) continue;
    plantas.push({ nombre: nombreEl.textContent, imagen });
  }
  return plantas;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test js/utils/catalog-gallery-3d.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Correr toda la suite para verificar que no rompió nada**

Run: `npm test`
Expected: PASS — todos los tests existentes más los nuevos.

- [ ] **Step 6: Commit**

```bash
git add js/utils/catalog-gallery-3d.js js/utils/catalog-gallery-3d.test.js
git commit -m "feat: add pure angle and DOM-extraction helpers for gallery-3d"
```

---

## Task 3: Construcción del anillo y wiring de GSAP/ScrollTrigger

**Files:**
- Modify: `js/utils/catalog-gallery-3d.js` (agregar `buildGallery3D` y `wireCatalogGallery3D`)

**Interfaces:**
- Consume: `angleForIndex`, `extraerPlantasDelDom` (Task 2); `qs`, `qsa` de `js/utils/dom.js:1-7`; `window.gsap`, `window.ScrollTrigger` (cargados globalmente por CDN, Task 1).
- Produce: `wireCatalogGallery3D(): { activar(): void, desactivar(): void }` — objeto con métodos que `catalog-view.js` (Task 4) llama al entrar/salir de vista 3. `activar()` construye el anillo la primera vez (si `#catalog-gallery-3d` está vacío) y muestra el contenedor; `desactivar()` solo oculta (no destruye el anillo, para no reconstruir en cada toggle).

- [ ] **Step 1: Implementar `buildGallery3D` y `wireCatalogGallery3D`**

Agregar al final de `js/utils/catalog-gallery-3d.js`:

```javascript
import { qs } from './dom.js';

const TRANSFORM_ORIGIN = '50% 400px';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function crearItem(planta) {
  const item = document.createElement('div');
  item.className = 'catalog-gallery-3d-item';

  const img = document.createElement('img');
  img.src = planta.imagen;
  img.alt = planta.nombre;
  img.loading = 'lazy';
  item.appendChild(img);

  return item;
}

function buildGallery3D(container) {
  const ring = qs('.catalog-gallery-3d-ring', container);
  const previewImg = qs('.catalog-gallery-3d-preview img', container);
  if (!ring || ring.childElementCount > 0) return; // ya construido

  const plantas = extraerPlantasDelDom(document);
  if (plantas.length === 0) return;

  const items = plantas.map((planta) => {
    const item = crearItem(planta);
    ring.appendChild(item);
    return item;
  });

  const total = items.length;
  const reduced = prefersReducedMotion();
  const gsap = window.gsap;

  items.forEach((item, index) => {
    const angle = angleForIndex(index, total);
    if (gsap && !reduced) {
      gsap.set(item, { rotationY: 90, rotationZ: angle, transformOrigin: TRANSFORM_ORIGIN });
    } else {
      item.style.transform = `rotateZ(${angle}deg) rotateY(90deg)`;
      item.style.transformOrigin = TRANSFORM_ORIGIN;
    }

    item.addEventListener('mouseover', () => {
      const img = item.querySelector('img');
      if (previewImg && img) previewImg.src = img.src;
      if (gsap && !reduced) {
        gsap.to(item, { x: 10, y: 10, z: 10, ease: 'power2.out', duration: 0.5 });
      }
    });

    item.addEventListener('mouseout', () => {
      if (previewImg) previewImg.src = plantas[0].imagen;
      if (gsap && !reduced) {
        gsap.to(item, { x: 0, y: 0, z: 0, ease: 'power2.out', duration: 0.5 });
      }
    });
  });

  if (previewImg) previewImg.src = plantas[0].imagen;

  if (!gsap || reduced) return;

  const ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const stage = qs('.catalog-gallery-3d-stage', container);
  container.addEventListener('mousemove', (event) => {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (event.clientX - centerX) / (rect.width / 2);
    const percentY = (event.clientY - centerY) / (rect.height / 2);

    gsap.to(ring, {
      duration: 1,
      ease: 'power2.out',
      rotateX: 55 + percentY * 2,
      rotateY: percentX * 2,
      overwrite: 'auto',
    });
  });

  if (ScrollTrigger) {
    ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
      onUpdate: (self) => {
        const rotationProgress = self.progress * 360;
        items.forEach((item, index) => {
          const currentAngle = angleForIndex(index, total) + rotationProgress;
          gsap.to(item, {
            rotationZ: currentAngle,
            duration: 1,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        });
      },
    });
  }
}

export function wireCatalogGallery3D() {
  const container = qs('#catalog-gallery-3d');

  return {
    activar() {
      if (!container) return;
      container.hidden = false;
      buildGallery3D(container);
      window.ScrollTrigger?.refresh();
    },
    desactivar() {
      if (!container) return;
      container.hidden = true;
    },
  };
}
```

- [ ] **Step 2: Correr la suite de tests para confirmar que no rompió las funciones puras**

Run: `npm test`
Expected: PASS — `angleForIndex`/`extraerPlantasDelDom` siguen pasando; no hay tests nuevos para `buildGallery3D`/`wireCatalogGallery3D` (dependen de DOM real + GSAP global, se verifican manualmente en Task 5).

- [ ] **Step 3: Commit**

```bash
git add js/utils/catalog-gallery-3d.js
git commit -m "feat: build 3D ring and wire GSAP scroll/mouse interactions"
```

---

## Task 4: Integrar con el selector de vistas

**Files:**
- Modify: `js/utils/catalog-view.js:1-49`

**Interfaces:**
- Consume: `wireCatalogGallery3D` de `./catalog-gallery-3d.js` (Task 3).

- [ ] **Step 1: Actualizar `applyView` para usar la galería 3D en vez de `#mensaje-view-3`**

En `js/utils/catalog-view.js`, reemplazar el archivo completo por:

```javascript
import { qs, qsa } from './dom.js';
import { wireCatalogGallery3D } from './catalog-gallery-3d.js';

const STORAGE_KEY = 'bitacora-catalog-view';

function setActiveButtons(switcher, view) {
  qsa('.catalog-view-btn', switcher).forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function applyView(page, view, gallery3d) {
  page.dataset.view = view;

  if (view === '3') {
    gallery3d.activar();
  } else {
    gallery3d.desactivar();
  }
}

export function wireCatalogView() {
  const page = qs('.catalog-page');
  const switcher = qs('.catalog-view-switch');
  if (!page || !switcher) return;

  const gallery3d = wireCatalogGallery3D();

  let initial = '1';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1' || saved === '2' || saved === '3') initial = saved;
  } catch {
    /* ignore */
  }

  applyView(page, initial, gallery3d);
  setActiveButtons(switcher, initial);

  switcher.addEventListener('click', (event) => {
    const btn = event.target.closest('.catalog-view-btn');
    if (!btn || !switcher.contains(btn)) return;
    const view = btn.dataset.view;
    if (!view) return;
    applyView(page, view, gallery3d);
    setActiveButtons(switcher, view);
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  });
}
```

- [ ] **Step 2: Correr la suite de tests**

Run: `npm test`
Expected: PASS (no hay tests directos de `catalog-view.js`, pero no debe romper nada existente).

- [ ] **Step 3: Commit**

```bash
git add js/utils/catalog-view.js
git commit -m "feat: switch to gallery-3d container when view 3 is active"
```

---

## Task 5: CSS de la galería circular 3D

**Files:**
- Modify: `css/styles.css:735-855` (bloque `.catalog-spotlight*` / `.catalog-page[data-view='3'] ...` actual)

**Interfaces:**
- Consume: estructura de Task 1 (`#catalog-gallery-3d`, `.catalog-gallery-3d-preview`, `.catalog-gallery-3d-stage`, `.catalog-gallery-3d-ring`) y `.catalog-gallery-3d-item` creado en Task 3.

- [ ] **Step 1: Reemplazar el bloque de vista 3 actual**

En `css/styles.css`, localizar el bloque que va desde:

```css
.catalog-spotlight {
  display: none;
}
```

hasta el cierre de:

```css
  .catalog-page[data-view='3'] .catalog-spotlight-side {
    order: -1;
    gap: var(--space-3);
  }
}
```

(aprox. líneas 735–855, confirmar con `grep -n "catalog-spotlight\|data-view='3'" css/styles.css` antes de editar) y reemplazarlo por:

```css
.catalog-gallery-3d {
  position: relative;
  height: 300vh;
  margin-top: 54px;
}

.catalog-gallery-3d[hidden] {
  display: none;
}

.catalog-gallery-3d-preview {
  position: sticky;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 200px;
  margin: 0 auto;
  overflow: hidden;
  background: var(--color-border);
}

.catalog-gallery-3d-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.catalog-gallery-3d-stage {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  perspective: 1500px;
}

.catalog-gallery-3d-ring {
  position: absolute;
  top: 19%;
  left: 49%;
  transform-style: preserve-3d;
  transform: translateX(-50%) rotateX(55deg);
}

.catalog-gallery-3d-item {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90px;
  height: 120px;
  background: var(--color-border);
  margin: 10px;
  transform-style: preserve-3d;
}

.catalog-gallery-3d-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.catalog-page[data-view='3'] .catalog-row.is-header {
  display: none;
}

.catalog-page[data-view='3'] #catalog-rows {
  display: none;
}

@media (max-width: 799px) {
  .catalog-gallery-3d-item {
    width: 56px;
    height: 74px;
    margin: 6px;
  }

  .catalog-gallery-3d-preview {
    width: 220px;
    height: 150px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalog-gallery-3d-stage {
    perspective: none;
  }

  .catalog-gallery-3d-ring {
    position: static;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    transform: none;
  }

  .catalog-gallery-3d-item {
    position: static;
    transform: none !important;
  }

  .catalog-gallery-3d-preview {
    display: none;
  }
}
```

- [ ] **Step 2: Verificar que no quedaron referencias muertas a `.catalog-spotlight`**

Run: `grep -n "catalog-spotlight" css/styles.css index.html scripts/generate-catalog-rows.mjs`
Expected: siguen apareciendo en `index.html` y `scripts/generate-catalog-rows.mjs` (el markup de `.catalog-spotlight` en las filas generadas queda igual, ya que vista 1/2 no lo usan pero no rompe nada que exista en el DOM oculto); en `css/styles.css` no debe quedar ninguna referencia a `.catalog-spotlight*` ni a `data-view='3'` fuera del bloque nuevo recién agregado.

Nota: si se prefiere limpiar también el markup `.catalog-spotlight` de `scripts/generate-catalog-rows.mjs` y regenerar, eso es un cambio aparte fuera de este plan (no afecta el resultado visual, ese markup queda simplemente sin usar).

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "style: replace spotlight view-3 CSS with 3D circular gallery"
```

---

## Task 6: Verificación manual en navegador

**Files:** (ninguno — solo verificación)

- [ ] **Step 1: Levantar el servidor estático**

Run: `python3 -m http.server 8000` desde la raíz del repo.

- [ ] **Step 2: Abrir el catálogo y activar vista 3**

Abrir `http://localhost:8000/index.html`, click en el botón "3" del selector de vista.
Expected:
- `#catalog-rows` se oculta, `#catalog-gallery-3d` se muestra.
- Aparece un anillo de imágenes en perspectiva 3D con las fotos reales de las plantas del catálogo (no las de `cg-3d-circular-img-gallery/assets`).
- Mover el mouse inclina el anillo.
- Pasar el mouse sobre un ítem lo agranda levemente y actualiza la imagen grande de preview arriba.
- Hacer scroll rota el anillo.

- [ ] **Step 3: Verificar persistencia y vuelta a vista 1/2**

Recargar la página con vista 3 activa (debe recordar la vista via `localStorage`), y volver a los botones 1 y 2.
Expected: vistas 1 y 2 se ven exactamente igual que antes de este cambio; no hay overlap entre `#catalog-gallery-3d` y `#catalog-rows`.

- [ ] **Step 4: Verificar `prefers-reduced-motion`**

En DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce", volver a activar vista 3.
Expected: el anillo se muestra como grilla estática sin animación de scroll/mouse, sin preview grande.

- [ ] **Step 5: Verificar mobile**

DevTools → responsive mode, ancho ≤ 480px, activar vista 3.
Expected: ítems más chicos, sin overflow horizontal, scroll vertical rota el anillo (sin mousemove real en touch, es aceptable que no incline).

- [ ] **Step 6: Correr toda la suite de tests una vez más**

Run: `npm test`
Expected: PASS.

(No hay commit en esta tarea — es solo verificación. Si se encuentran bugs, corregir en el archivo correspondiente y hacer un commit de fix con `git add <archivo> && git commit -m "fix: ..."`.)
