# Bitácora por planta de Colección — Design

Fecha: 2026-08-14  
Estado: pendiente de revisión

## Objetivo

Cada planta de Colección tiene un diario propio. La card sigue siendo la ficha
de especie. Un renglón `Bitácora → Ver` abre una página solo con el historial
de ese ejemplar: fecha en colección, último / próximo riego, registrar un
cuidado y ver lo que se fue cargando.

## Decisiones

| Tema | Decisión |
| --- | --- |
| Dónde vive el detalle | En la card de Colección. No se duplica en la bitácora. |
| Dónde vive el diario | Página nueva `bitacora.html?id={uuid}`. |
| Puerta de entrada | Renglón en la card, arriba de Eliminar: etiqueta `Bitácora`, link `Ver`. |
| Frecuencia de riego | La del catálogo en la estación actual (`Cada 10 días` → 10). Sin formulario de “cada cuántos días”. |
| Identidad del diario | La fila de `user_collection` (`id` uuid), no la tabla `plantas`. |
| `planta.html` | No se toca. |

Fuera de este corte: editar la ficha, apodo, ubicación real, borrar eventos,
notificaciones, tipos de cuidado personalizados.

## Card de Colección

Las filas actuales no cambian. Se inserta una fila nueva **encima** de
`Colección / Eliminar`:

```
Bitácora    Ver
Colección   Eliminar
```

- `Ver` es un `<a class="coleccion-bitacora-link" href="bitacora.html?id={uuid}">`
  con `aria-label="Ver bitácora de {nombre}"`.
- El `id` es `user_collection.id` (uuid de la fila), no el `planta_id` del
  catálogo. Eliminar sigue usando `idDeColeccion()` como hoy
  (`planta_id || id`).
- Si la fila no tiene `id`, no se renderiza el link (no debería pasar:
  `listarColeccion()` hace `select('*')`).
- El click en `Ver` no dispara Eliminar. El renglón entero no es clickeable;
  solo el link.

## Página `bitacora.html`

Mismo chrome que Colección (header, nav, sidebar, reloj, botón de sesión).
Colección queda como ítem activo del nav: esta página es un desglose, no una
sección nueva. Un link `Volver` apunta a `coleccion.html`.

Sin ítem “Bitácora” en la navegación.

Tres zonas, en este orden.

### 1. Estado

Nombre de la planta como título. Foto de la card, si hay, chica.

Filas al estilo de la card:

| Etiqueta | Valor |
| --- | --- |
| En colección | Fecha de `user_collection.created_at`, en calendario local (`12 ago 2026`). |
| Último riego | Fecha del último evento `regar`, o `Sin registrar`. |
| Próximo riego | Texto calculado (abajo). Si no hay frecuencia parseable: `—`. |

### 2. Registrar

Un formulario:

- Tipo: select. Default `regar`. Opciones visibles: Regar, Fertilizar,
  Trasplantar, Podar. No se muestra `otro`.
- Fecha: `input type="date"`, default hoy (calendario local, misma lógica que
  `planta.js`: no usar UTC a secas).
- Notas: texto opcional.
- Botón `Registrar`.

Al guardar, se limpia el formulario (fecha vuelve a hoy), se refresca Estado y
Historial. No hay pantalla de config de frecuencias.

### 3. Historial

Lista cronológica, lo más nuevo arriba. Cada ítem:

`{Tipo} — {fecha local}` y la nota debajo, si hay.

Vacío: `Todavía no hay registros.`

No se editan ni se borran eventos en este corte.

## Cálculo de riego

Reutilizar `calcularProximoVencimiento` de `js/utils/recordatorios.js`.

1. Frecuencia: parsear el riego de la estación actual. `diasDeRiego("Cada 10 días")`
   → `10`. Si el texto no matchea `/^Cada (\d+) días$/i`, frecuencia `null`.
2. Base: fecha del último evento `tipo = 'regar'`. Si no hay, `created_at` de
   la fila de colección.
3. Próximo = base + frecuencia en días.
4. Texto, comparando días de calendario local (no horas):

| Diferencia | Texto |
| --- | --- |
| `> 0` | `En N días` (`En 1 día` si N = 1) |
| `0` | `Hoy` |
| `< 0` | `Hace N días` (`Hace 1 día` si N = 1) |

`user_collection.ultimoriego` (copia del catálogo) **no se usa**. El último
riego sale solo de `coleccion_cuidados`.

La estación se lee con `estacionActual()` al cargar la página. Cambiar la
estación en Colección no actualiza una bitácora ya abierta hasta recargar.

## Modelo de datos

La bitácora cuelga de Colección. No se crea una fila en `plantas` al agregar
del catálogo.

### `user_collection.created_at`

Si la columna no existe:

```sql
alter table public.user_collection
  add column if not exists created_at timestamptz not null default now();
```

Las filas ya existentes quedan con el timestamp de la migración. No hay fecha
real de alta para esas filas; se documenta y se acepta en este corte.

### `coleccion_cuidados`

```sql
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
```

`tipo_cuidado` ya existe: `'regar' | 'fertilizar' | 'trasplantar' | 'podar' | 'otro'`.
La UI no expone `otro`; si llegara un evento con ese tipo, el historial lo
muestra como `Otro`.

### RLS

Habilitar RLS. Policies `for all` a `authenticated`, con
`(select auth.uid())` (mismo patrón que `0001_init.sql`):

- puede operar la fila si existe `user_collection` con ese `coleccion_id` y
  `user_id = auth.uid()`.

Al borrar la planta de Colección, los eventos se van con el `on delete cascade`.

## Archivos

| Archivo | Rol |
| --- | --- |
| `js/utils/coleccion-card.js` | Fila Bitácora / `Ver` con `href` al uuid. |
| `js/utils/coleccion-card.test.js` | El markup incluye el link y no rompe Eliminar. |
| `js/utils/riego-frecuencia.js` | `diasDeRiego`, `textoProximoRiego`. |
| `js/utils/riego-frecuencia.test.js` | Parseo y copy de “En / Hoy / Hace”. |
| `js/services/coleccion-cuidados.js` | Listar y registrar eventos de una fila de colección. |
| `bitacora.html` | Página nueva, chrome de catálogo. |
| `js/pages/bitacora.js` | Guard de sesión, carga, formulario, render. |
| `css/styles.css` | Estilos de la página, alineados a Colección. |
| `supabase/migrations/0002_coleccion_bitacora.sql` | `created_at` + tabla + RLS + índice. |

No se modifican `planta.html`, `js/pages/planta.js` ni `js/services/cuidados.js`.

`js/pages/coleccion.js` no necesita lógica nueva: el link vive en el markup.
El chrome de `bitacora.html` reutiliza `wireReloj`, `wireAuthNav`, `wireAuthModal`
y el menú lateral igual que Colección, sin filtros.

## Flujo de datos

1. Colección lista `user_collection`. Cada card arma `bitacora.html?id={id}`.
2. `bitacora.js` pide sesión. Sin sesión: chrome visible, mensaje para iniciar
   sesión (mismo criterio que Colección). Tras login, carga esa planta.
3. Carga la fila `user_collection` con `id` y `user_id = auth.uid()`. Si no hay
   fila (id inválido, de otra persona, o RLS), mensaje
   `No encontramos esa planta.` y link a Colección. No se distingue “no existe”
   de “no es tuya”.
4. Carga `coleccion_cuidados` de esa fila, orden `fecha` desc.
5. Calcula Estado con riego de la estación actual + último `regar`.
6. Registrar inserta una fila y vuelve a pintar Estado e Historial.

## Errores

- Fallos de red o de Supabase: mensaje inline junto a la acción, sin `alert()`.
- Registrar sin fecha: el `required` del input lo bloquea.
- Registrar sin sesión: no se envía; se ofrece iniciar sesión.
- Si falla el insert, el historial no se pinta como si hubiera guardado.

## Tests

`npm test` sigue corriendo `js/utils/*.test.js`. Cubrir utilidades puras:

- Card: existe un `a.coleccion-bitacora-link` a `bitacora.html?id={uuid}`;
  la fila va **antes** de Eliminar; Eliminar no cambia.
- `diasDeRiego('Cada 10 días') === 10`; `'Cada 1 días'` → 1; texto vacío o
  `'—'` → `null`.
- `textoProximoRiego`: `En 3 días`, `En 1 día`, `Hoy`, `Hace 2 días`,
  `Hace 1 día`; frecuencia `null` → `null` (la página muestra `—`).

Sin tests de `bitacora.js` ni del servicio: dependen de Supabase, igual que
el resto de páginas.

Verificación manual:

1. Agregar una planta a Colección → aparece `Bitácora / Ver`.
2. Entrar → En colección tiene fecha; último riego `Sin registrar`; próximo
   riego cuenta desde la fecha de alta.
3. Registrar un riego en hoy → último riego = hoy; próximo = hoy + N días
   del catálogo; el historial muestra el evento.
4. Registrar fertilizar → no cambia “Último riego”; sí aparece en el historial.
5. Volver a Colección → la ficha sigue igual.
6. Eliminar la planta → la bitácora de ese id muestra “No encontramos esa planta.”
7. Sin sesión, abrir `bitacora.html?id=…` → pide login; tras entrar, si el id
   es de esa cuenta, se ve el diario.
