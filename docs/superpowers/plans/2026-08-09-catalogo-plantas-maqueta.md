# Catálogo de plantas (maqueta) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear `plantas.html` como maqueta estática del catálogo tipográfico (~150 filas, 6 columnas con `+`), sin tocar el layout del dashboard ni cablear Supabase.

**Architecture:** HTML estático + clases CSS nuevas en `styles.css` con prefijo `catalog-` para no romper login/dashboard. Las ~150 filas se generan una vez con un script Node local que escribe markup dentro de `plantas.html`; la página final no carga JS de app.

**Tech Stack:** HTML5, CSS3 (Grid), Node.js (solo para generar filas placeholder una vez). Sin Supabase, sin bundler.

**Spec:** `docs/superpowers/specs/2026-08-09-catalogo-plantas-maqueta-design.md`

## Global Constraints

- Solo maqueta visual: sin auth, sin Supabase, sin scripts de página en `plantas.html`.
- No rediseñar `dashboard.html` en esta entrega.
- Columnas exactas: Nombre · Especie · Riego · Ubicación · Último riego · `+`.
- ~150 filas placeholder; filas mixtas negro / gris (`#A0A0A0`).
- Clases CSS nuevas con prefijo `catalog-` (o bloque scoped) para no alterar `.topbar`, `.grid-plantas`, etc.
- Tipografía de índice compacta (no h1 70px del design system en esta página).
- Commits solo si el usuario los pide explícitamente en la sesión de ejecución; los pasos de commit del plan son opcionales.

---

### Task 1: Estilos del layout índice (catálogo)

**Files:**
- Modify: `css/styles.css` (agregar al final; no editar reglas existentes de dashboard/login)

**Interfaces:**
- Produces: clases `.catalog-page`, `.catalog-header`, `.catalog-header-left`, `.catalog-nav`, `.catalog-nav-link`, `.catalog-nav-link.is-active`, `.catalog-meta`, `.catalog-list`, `.catalog-row`, `.catalog-row.is-muted`, `.catalog-cell`, `.catalog-cell--right`, `.catalog-cell--action`, `.catalog-add`
- Consumes: tokens existentes `--color-black`, `--color-white`, `--color-gray-light`, `--space-*` donde aplique

- [ ] **Step 1: Añadir bloque CSS del catálogo al final de `css/styles.css`**

```css
/* --- Catálogo (plantas.html) — índice tipográfico --- */
.catalog-page {
  min-height: 100vh;
  background: var(--color-white);
  color: var(--color-black);
  font-family: Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.35;
}

.catalog-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-6);
  align-items: start;
  padding: var(--space-8) var(--space-10) var(--space-15);
}

.catalog-header-left {
  max-width: 28rem;
  margin: 0;
  color: var(--color-black);
}

.catalog-nav {
  display: flex;
  gap: var(--space-5);
  justify-content: center;
  padding-top: 2px;
}

.catalog-nav-link {
  color: var(--color-black);
  text-decoration: none;
}

.catalog-nav-link.is-active {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.catalog-meta {
  text-align: right;
  color: var(--color-black);
}

.catalog-meta p {
  margin: 0;
}

.catalog-list {
  padding: 0 var(--space-10) var(--space-15);
}

.catalog-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 0.9fr 2.5rem;
  gap: var(--space-4);
  align-items: baseline;
  padding: 3px 0;
  color: var(--color-black);
}

.catalog-row.is-header {
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.catalog-row.is-muted {
  color: var(--color-gray-light);
}

.catalog-cell--right {
  text-align: right;
}

.catalog-cell--action {
  text-align: right;
}

.catalog-add {
  display: inline-block;
  color: inherit;
  text-decoration: none;
  font-size: 16px;
  line-height: 1;
  cursor: default;
  user-select: none;
}

@media (max-width: 799px) {
  .catalog-header {
    grid-template-columns: 1fr;
    padding: var(--space-6) var(--space-4);
  }

  .catalog-meta {
    text-align: left;
  }

  .catalog-nav {
    justify-content: flex-start;
  }

  .catalog-list {
    padding: 0 var(--space-4) var(--space-10);
    overflow-x: auto;
  }

  .catalog-row {
    min-width: 720px;
  }
}
```

- [ ] **Step 2: Verificar que no se rompió el dashboard**

Abrir `dashboard.html` (con o sin sesión). Confirmar visualmente que topbar, botones y grilla de cards siguen iguales.

- [ ] **Step 3: Commit (opcional, solo si el usuario lo pide)**

```bash
git add css/styles.css
git commit -m "$(cat <<'EOF'
style: add catalog index layout classes for plantas page

EOF
)"
```

---

### Task 2: Shell HTML de `plantas.html`

**Files:**
- Create: `plantas.html`

**Interfaces:**
- Consumes: clases CSS de Task 1; `css/styles.css`
- Produces: estructura con `#catalog-rows` vacío (o con header row) lista para rellenar en Task 3

- [ ] **Step 1: Crear `plantas.html` con header + encabezados de columna**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Plantas — Bitácora de Plantas</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body class="catalog-page">
  <header class="catalog-header">
    <p class="catalog-header-left">
      Bitácora de Plantas es un espacio para registrar y cuidar la colección
      de tu casa — explorá el catálogo y sumá las que ya tenés.
    </p>
    <nav class="catalog-nav" aria-label="Principal">
      <a class="catalog-nav-link is-active" href="plantas.html">Plantas</a>
      <a class="catalog-nav-link" href="dashboard.html">Dashboard</a>
    </nav>
    <div class="catalog-meta">
      <p>Versión 0.1.0 (8.2026)</p>
      <p>10:40 ART 9 August 2026</p>
    </div>
  </header>

  <main class="catalog-list" aria-label="Catálogo de plantas">
    <div class="catalog-row is-header" role="row">
      <span>Nombre</span>
      <span>Especie</span>
      <span>Riego</span>
      <span>Ubicación</span>
      <span class="catalog-cell--right">Último riego</span>
      <span class="catalog-cell--action" aria-hidden="true"></span>
    </div>
    <div id="catalog-rows">
      <!-- filas generadas en Task 3 -->
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 2: Abrir en el navegador y chequear header**

Abrir `plantas.html` (file:// o servidor estático). Verificar: 3 zonas del header, nav con Plantas subrayado, link Dashboard, sin errores de consola por scripts faltantes.

- [ ] **Step 3: Commit (opcional, solo si el usuario lo pide)**

```bash
git add plantas.html
git commit -m "$(cat <<'EOF'
feat: add static plantas catalog page shell

EOF
)"
```

---

### Task 3: Generar ~150 filas placeholder

**Files:**
- Create (temporal): `scripts/generate-catalog-rows.mjs`
- Modify: `plantas.html` (rellenar `#catalog-rows`)
- Delete after use: `scripts/generate-catalog-rows.mjs` (opcional; puede quedarse si sirve para regenerar)

**Interfaces:**
- Consumes: shell de Task 2 (`#catalog-rows`)
- Produces: ~150 `.catalog-row` dentro de `#catalog-rows`; ~40–50% con clase `is-muted`

- [ ] **Step 1: Crear el generador**

Crear `scripts/generate-catalog-rows.mjs` con una lista base de plantas reales (nombres + familia/especie) y ciclos de riego/ubicaciones/fechas. El script debe:

1. Expandir/combinar hasta **150** filas únicas (variantes de nombre si hace falta: p. ej. `Monstera Deliciosa`, `Monstera Deliciosa Variegata`).
2. Alternar ~cada 2ª o 3ª fila con `is-muted` (no un patrón rígido 1-1; mezclar como la referencia).
3. Emitir HTML de filas con esta forma exacta:

```html
<div class="catalog-row">
  <span>Monstera Deliciosa</span>
  <span>Araceae</span>
  <span>Cada 7 días</span>
  <span>Living</span>
  <span class="catalog-cell--right">2026-08-01</span>
  <span class="catalog-cell--action"><span class="catalog-add" title="Agregar al dashboard" aria-label="Agregar al dashboard">+</span></span>
</div>
```

4. Reemplazar el contenido de `#catalog-rows` en `plantas.html` (leer archivo, regex o split por markers).

Datos mínimos a rotar en el script:

```js
const BASE = [
  ['Monstera Deliciosa', 'Araceae'],
  ['Ficus Lyrata', 'Moraceae'],
  ['Pothos Golden', 'Araceae'],
  ['Sansevieria Trifasciata', 'Asparagaceae'],
  ['Calathea Orbifolia', 'Marantaceae'],
  ['Philodendron Brasil', 'Araceae'],
  ['ZZ Plant', 'Araceae'],
  ['Aloe Vera', 'Asphodelaceae'],
  ['Pilea Peperomioides', 'Urticaceae'],
  ['Dracaena Marginata', 'Asparagaceae'],
  // …ampliar a ≥40 entradas base reales; el script completa hasta 150
];

const RIEGOS = ['Cada 5 días', 'Cada 7 días', 'Cada 10 días', 'Cada 14 días', 'Cada 21 días', 'Cada 30 días'];
const UBICS = ['Living', 'Balcón', 'Oficina', 'Dormitorio', 'Cocina', 'Patio', 'Estudio', 'Baño'];
```

Fechas de “Último riego”: strings `YYYY-MM-DD` entre `2025-01-01` y `2026-08-09`.

- [ ] **Step 2: Ejecutar el generador**

```bash
node scripts/generate-catalog-rows.mjs
```

Expected: exit 0; `plantas.html` contiene ~150 `.catalog-row` dentro de `#catalog-rows` (además del header row).

Verificación rápida:

```bash
node -e "const fs=require('fs'); const h=fs.readFileSync('plantas.html','utf8'); const n=(h.match(/class=\"catalog-row(?! is-header)/g)||[]).length; console.log(n); if(n<148||n>155) process.exit(1)"
```

Expected: imprime un número ≈150 y exit 0.

- [ ] **Step 3: Verificar en el navegador**

Abrir `plantas.html`. Confirmar:

1. Lista larga con columnas alineadas bajo los headers.
2. Mezcla de filas negras y grises.
3. `+` visible a la derecha de cada fila.
4. Último riego alineado a la derecha.
5. Sin `<script>` de app / sin errores de consola por módulos faltantes.
6. Link Dashboard sigue yendo a `dashboard.html`.

- [ ] **Step 4: Commit (opcional, solo si el usuario lo pide)**

```bash
git add plantas.html scripts/generate-catalog-rows.mjs css/styles.css
git commit -m "$(cat <<'EOF'
feat: add plantas catalog mockup with 150 placeholder rows

EOF
)"
```

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| `plantas.html` nueva maqueta | Task 2–3 |
| Header 3 zonas | Task 2 |
| 6 columnas (Nombre… +) | Task 2–3 |
| ~150 placeholders | Task 3 |
| Negro / gris | Task 1 + 3 |
| CSS sin romper dashboard | Task 1 |
| Sin Supabase/JS de página | Task 2 (sin scripts) |
| Dashboard sin rediseño | Ninguna task lo modifica |

## Fuera de este plan

- Lógica del botón `+`
- Rediseño del dashboard
- Auth en catálogo
- Búsqueda / filtros
