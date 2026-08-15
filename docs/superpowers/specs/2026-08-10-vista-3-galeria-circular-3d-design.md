# Vista 3 del catálogo — Galería circular 3D

## Contexto

El catálogo (`index.html`) tiene un selector de vista con tres botones (`data-view="1"`, `"2"`, `"3"`). Hoy:

- **Vista 1**: lista de filas (`.catalog-row`).
- **Vista 2**: grilla de tiles (`.catalog-tile`).
- **Vista 3**: layout "spotlight" (fila grande apilada, `.catalog-spotlight`) ya implementado en CSS (`.catalog-page[data-view='3'] ...`), aunque el HTML todavía conserva un mensaje placeholder `#mensaje-view-3` ("Vista 3 todavía no está definida") que en la práctica queda siempre oculto vía JS.

El pedido: reemplazar el contenido de la vista 3 por el efecto de galería circular 3D de la referencia en `cg-3d-circular-img-gallery/` (GSAP + ScrollTrigger, anillo de imágenes en perspectiva 3D que rota con el scroll y se inclina con el mouse, con preview grande al hacer hover), reutilizando las imágenes reales de las plantas del catálogo (las mismas `data-imagen` que ya usan las vistas 1 y 2) en lugar de los 15 assets estáticos del demo.

## Decisiones confirmadas

1. **Alcance**: se reemplaza completamente la vista 3 actual (spotlight). El botón "3" pasa a activar la galería circular 3D.
2. **Fidelidad**: réplica fiel del comportamiento de la referencia — GSAP + ScrollTrigger para la rotación por scroll, tilt por `mousemove`, y preview grande al hover — adaptada al catálogo real (50 plantas, no 150 ítems duplicados).
3. **Scroll de rotación**: la galería usa una altura fija dedicada (ej. `300vh`) al activarse la vista 3, en vez de depender del alto natural del listado. Da rango suficiente para una rotación completa del anillo, sin inflar el resto de la página cuando no está activa.

## Alcance del cambio

### HTML (`index.html`)

- Se elimina `#mensaje-view-3` (placeholder muerto) y su referencia en `catalog-view.js`.
- Se agrega, dentro de `.catalog-list`, un contenedor hermano de `#catalog-rows`, oculto salvo en vista 3:

```html
<div id="catalog-gallery-3d" class="catalog-gallery-3d" hidden>
  <div class="catalog-gallery-3d-preview"><img alt="" /></div>
  <div class="catalog-gallery-3d-stage">
    <div class="catalog-gallery-3d-ring"></div>
  </div>
</div>
```

- Los `.item` del anillo (imagen + nombre) se generan por JS a partir de las `.catalog-entry` ya presentes en el DOM — no se duplica el HTML de las 50 plantas.
- Se agregan los `<script>` de GSAP y ScrollTrigger vía CDN (mismo origen que usa la referencia), con `defer`, antes del bundle de la página.

### CSS (`css/styles.css`)

- Se elimina el bloque de reglas de `.catalog-spotlight*` y `.catalog-page[data-view='3'] ...` actual, reemplazado por reglas con namespace `catalog-gallery-3d-*`:
  - `.catalog-page[data-view='3'] #catalog-rows { display: none; }`
  - `.catalog-page[data-view='3'] #catalog-gallery-3d { ... }` (contenedor con `height: 300vh`, `perspective`, y el anillo con `transform-style: preserve-3d`).
  - Tamaño de `.catalog-gallery-3d-item` mayor que el demo original (45×60px), ajustado a que el anillo se vea bien con 50 ítems en vez de 150.
  - El preview grande se posiciona `fixed`/`sticky` centrado, igual que `.preview-img` del demo.
- Media query `max-width: 799px`: reduce radio del anillo y tamaño de preview; sin `mousemove` en touch, la interacción queda limitada a la rotación por scroll.
- Respeta `prefers-reduced-motion: reduce` (ya hay un bloque global para esto): sin animaciones de scroll/mouse, anillo estático con los ítems distribuidos.

### JS

- Nuevo módulo `js/utils/catalog-gallery-3d.js`:
  - `buildGallery3D()`: lee las `.catalog-entry` visibles del DOM (nombre desde `.catalog-tile-name`, imagen desde `data-imagen` del botón `.catalog-add`), crea un `.item` por planta dentro del anillo con `gsap.set` para `rotationY` / `rotationZ` / `transformOrigin`, replicando el cálculo de ángulo de la referencia (`360 / numberOfItems`).
  - Listener de `mousemove` → inclina el anillo (`rotateX`/`rotateY`) con `gsap.to`.
  - Listener de hover por `.item` → magnifica ese ítem (`x`/`y`/`z`) y actualiza el preview grande con su imagen.
  - `ScrollTrigger.create` sobre el contenedor `#catalog-gallery-3d` (no `body`, para no afectar el scroll cuando esa vista no está activa) rotando el anillo en función del progreso.
  - Inicialización perezosa: la construcción del anillo y el wiring de listeners ocurre una sola vez, la primera vez que se activa la vista 3 (no en cada toggle).
  - Si `prefers-reduced-motion: reduce`, se omite el wiring de scroll/mouse y el anillo queda estático.
- `catalog-view.js`: al aplicar vista `'3'`, se llama a `buildGallery3D()` (idempotente) y se muestra/oculta `#catalog-gallery-3d` vs `#catalog-rows` en vez de tocar `#mensaje-view-3`.

## Fuera de alcance

- No se tocan las vistas 1 y 2 ni sus estilos.
- No se agregan imágenes nuevas: se reutilizan las 50 `data-imagen` ya presentes en el catálogo.
- No se persiste ni sincroniza estado del anillo (posición de scroll, ítem hovereado) entre cambios de vista.
