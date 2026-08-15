# Catálogo de plantas (maqueta) — Design Spec

Fecha: 2026-08-09  
Estado: aprobado en conversación; pendiente de revisión del archivo

## Contexto

Bitácora de Plantas tendrá dos superficies distintas:

1. **Plantas** — catálogo exploratorio de especies/variedades disponibles.
2. **Dashboard** — colección personal del usuario (plantas que tiene en casa).

Esta spec cubre **solo la maqueta visual del catálogo** (`plantas.html`). El dashboard y la lógica de “agregar a mi casa” quedan fuera de alcance por ahora.

## Objetivo

Validar el layout tipográfico tipo índice (referencia scco.studio) aplicado a un catálogo de plantas, con ~150 filas placeholder y una columna de acción **+**.

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Separación de páginas | `plantas.html` = catálogo; `dashboard.html` = plantas del usuario |
| Layout del dashboard | Aplazado (opción C); no se rediseña en esta entrega |
| Agregar al dashboard | Columna **+** visible en el catálogo; sin lógica en la maqueta |
| Datos | Estáticos en HTML; sin Supabase ni JS de página |
| Cantidad | ~150 filas placeholder |

## Layout

### Header (3 zonas)

- **Izquierda:** texto corto descriptivo de Bitácora de Plantas.
- **Centro:** navegación `Plantas` (activo, subrayado) · `Dashboard` (link a `dashboard.html`).
- **Derecha:** metadata estática (versión + marca de tiempo ficticia).

### Lista principal

CSS Grid de **6 columnas**, sin bordes, sin cards, sin líneas de fila:

| Columna | Contenido ejemplo |
|---------|-------------------|
| Nombre | Monstera Deliciosa |
| Especie | Araceae |
| Riego | Cada 7 días |
| Ubicación | Living |
| Último riego | 2026-08-01 (alineado a la derecha) |
| Acción | `+` (solo visual) |

Jerarquía tipográfica:

- Encabezados de columna en negro.
- Filas mixtas: énfasis en negro / secundarias en gris medio (~`#A0A0A0`), para imitar la referencia.

## Estilo visual

- Fondo blanco (`#FFFFFF`).
- Texto negro / gris; sin acentos de color en la maqueta.
- Tipografía sans-serif limpia, tamaño compacto de índice (no display XL del design system Filotaxia).
- Márgenes exteriores generosos; mucho aire horizontal entre columnas.
- Responsive: en viewport angosto, columnas secundarias pueden ocultarse o la lista puede hacer scroll horizontal; prioridad desktop.

## Archivos

| Archivo | Rol |
|---------|-----|
| `plantas.html` | Nueva página de maqueta (HTML estático) |
| `css/styles.css` | Estilos del layout índice/catálogo (clases nuevas, sin romper login/dashboard actuales) |
| `dashboard.html` | Sin cambios de layout en esta entrega |

## Fuera de alcance

- Auth / sesión / Supabase en `plantas.html`
- Persistencia de “agregar al dashboard”
- Detalle de planta desde el catálogo
- Rediseño del dashboard
- Búsqueda, filtros o paginación
- Fotos en la lista del catálogo

## Criterios de éxito

1. Abrir `plantas.html` en el navegador muestra el layout de índice sin errores de consola por scripts faltantes.
2. Se ven ~150 filas con las 6 columnas acordadas.
3. El **+** es visible en cada fila (sin acción).
4. `dashboard.html` y el resto de la app siguen funcionando como antes.

## Visión posterior (no implementar ahora)

- Usuario explora el catálogo y con **+** agrega una entrada a su dashboard.
- También podrá cargar plantas propias que no estén en el catálogo.
- El dashboard mostrará solo la colección personal (layout a definir).
