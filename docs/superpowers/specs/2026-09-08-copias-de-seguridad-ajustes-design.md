# Copias de seguridad + pantalla de Ajustes

Fecha: 2026-09-08
Estado: aprobado para plan

## Problema

El usuario carga en su bitácora datos que no puede permitirse perder: la
colección de plantas, las entradas de cuidados (riegos y notas a lo largo del
tiempo) y las fotos que sube en la galería de cada planta. Hoy no hay ninguna
red de seguridad: un bug, un borrado accidental o una restauración a medias le
haría perder todo sin forma de volver.

`inspo/finanzapp` ya resolvió esto para su caso: una tabla de snapshots aparte,
copia manual, copia automática diaria silenciosa, descarga/restauración por
archivo `.json`, y una copia automática previa a cada restauración. Este diseño
adapta esa lógica a bitácora-plantas, que es multipágina y tiene los datos del
usuario repartidos en tres tablas más binarios en Storage.

## Alcance

Incluye:

- Pantalla nueva `ajustes.html` con la gestión de copias de seguridad.
- Botón "Ajustes" en la navegación, al lado del botón de sesión, visible solo
  con sesión iniciada.
- Servicio de copias: crear, listar, borrar, restaurar, descargar `.json`,
  restaurar desde archivo, y copia automática diaria.
- Migración `0005_user_backups.sql`.
- Las copias incluyen las fotos de galería (binarios), copiadas dentro de
  Storage para las copias en la nube y en base64 para el archivo `.json`.

No incluye (YAGNI, por ahora):

- Cualquier otra opción en Ajustes que no sea copias de seguridad.
- Cifrado del archivo `.json`.
- Restauración selectiva (solo una planta, solo un rango de fechas).
- Restauración con mezcla: restaurar siempre reemplaza todo.

## Modelo de datos

### Migración `supabase/migrations/0005_user_backups.sql`

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

create policy "user_backups_owner_all" on public.user_backups
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

`(select auth.uid())` en vez de `auth.uid()` para que Postgres cachee el valor
una vez por consulta, igual que el resto de las policies del proyecto.

### Storage

Los binarios de las fotos de una copia van al bucket existente `plantas-fotos`,
en:

```
{user_id}/backups/{backup_id}/{coleccion_id}/{archivo}
```

Las policies `plantas_fotos_owner_select/insert/update/delete` de la migración
`0001_init.sql` chequean solo `(storage.foldername(name))[1] = auth.uid()::text`,
así que ya cubren este subpath. **No hace falta policy nueva de Storage.**

Las fotos vivas siguen en `{user_id}/coleccion/{coleccion_id}/{archivo}`, sin
cambios.

## Formato del snapshot

Un snapshot es un objeto:

```js
{
  app: 'bitacora-plantas',
  format: 1,
  user_id: '<uuid>',
  created_at: '<ISO 8601>',
  data: {
    user_collection: [ { /* fila completa de user_collection */ } ],
    coleccion_cuidados: [ { /* fila completa de coleccion_cuidados */ } ],
    coleccion_fotos: [
      {
        /* fila completa de coleccion_fotos */
        backup_path: '{user_id}/backups/{backup_id}/{coleccion_id}/{archivo}'
      }
    ]
  }
}
```

- **Nube:** `user_backups.snapshot` guarda este objeto tal cual. `backup_path`
  apunta al binario copiado dentro de Storage.
- **Archivo `.json`:** el mismo objeto, pero cada elemento de `coleccion_fotos`
  lleva además `bytes_base64` con el contenido del archivo, para que el `.json`
  sea autónomo y no dependa de Storage.

Se guarda la fila completa de cada tabla (no una selección de columnas) para que
el snapshot sobreviva a que se agreguen columnas nuevas sin tener que tocar el
formato.

## Componentes

### `js/utils/backup-snapshot.js` (lógica pura, con tests)

Funciones sin efectos ni dependencias de red o DOM, testeables con `node --test`
igual que el resto de `js/utils/`:

- `validarSnapshot(obj)` → `{ ok, snapshot }` o `{ ok: false, motivo }`.
  Rechaza `null`, no-objeto, `app` distinto de `bitacora-plantas`, `format`
  desconocido, o `data` sin ninguna de las tres claves reconocibles. Normaliza:
  las claves ausentes quedan como `[]`.
- `debeHacerAutoBackup(ultimaFechaISO, hoyISO)` → `boolean`. `true` si
  `ultimaFechaISO` es `null` o su día (`slice(0,10)`) es anterior a `hoyISO`.
- `copiasAPodar(filas, conservar)` → `filas[]`. Recibe las filas de copias
  automáticas ordenadas por `created_at` desc y devuelve las que sobran después
  de conservar las `conservar` más nuevas.
- `nombreArchivoDescarga(fechaISO)` → `'bitacora-plantas-AAAA-MM-DD.json'`.

### `js/utils/backup-snapshot.test.js`

- `validarSnapshot`: rechaza vacío/dañado/`app` incorrecto; acepta el formato
  bueno; normaliza claves ausentes a `[]`.
- `debeHacerAutoBackup`: `null` → `true`; mismo día → `false`; día anterior →
  `true`.
- `copiasAPodar`: con 7 y `conservar = 7` → `[]`; con 10 → las 3 más viejas.
- `nombreArchivoDescarga`: formato y fecha correctos.

### `js/services/backups.js`

Depende de `../config.js` (`supabase`) y `./auth.js` (`getSession`). Reusa
`limpiarCacheColeccion` de `./coleccion.js` después de restaurar.

| Función | Comportamiento |
|---|---|
| `crearSnapshotActual()` | Lee `user_collection` por `user_id`; junta los `id` de esas colecciones y lee `coleccion_cuidados` y `coleccion_fotos` por `coleccion_id in (...)`. Devuelve el objeto snapshot sin `bytes_base64` y sin `backup_path`. |
| `crearCopia(label)` | 1) Inserta la fila en `user_backups` con el snapshot y `photo_count`. 2) Por cada foto, `supabase.storage.from('plantas-fotos').copy(storage_path, backupPath)`. 3) `update` de la fila con el snapshot ya con `backup_path` en cada foto. Devuelve `{ id, created_at, label }`. |
| `listarCopias()` | `select id,label,photo_count,created_at` por `user_id`, orden `created_at` desc. |
| `borrarCopia(id)` | Lee el snapshot de esa copia, `remove()` de todos los `backup_path`, después `delete` de la fila. Pide confirmación con `window.confirm`. |
| `restaurarCopia(id)` | Trae el snapshot de la nube y llama a `aplicarSnapshot(snap, { fuente: 'nube' })`. |
| `restaurarDesdeArchivo(file)` | `FileReader` → `JSON.parse` → `validarSnapshot`. Si pasa, `aplicarSnapshot(snap, { fuente: 'archivo' })`. |
| `descargarArchivo()` | `crearSnapshotActual()` + por cada foto baja el binario vivo (`download`) y lo codifica a base64 → arma el `.json` → dispara la descarga con un `<a download>` temporal. |
| `autoBackupSiCorresponde()` | Si `debeHacerAutoBackup(localStorage[clave], hoy)` y no hay ya una copia de hoy en la tabla (chequeo por si fue otro dispositivo), `crearCopia('Copia automática')` y podar con `copiasAPodar(auto, 7)`. Marca la fecha en `localStorage`. Silenciosa: cualquier error se traga. |

Constantes: `LABEL_AUTO = 'Copia automática'`, `CONSERVAR_AUTO = 7`,
`BUCKET = 'plantas-fotos'`, `TABLA = 'user_backups'`.

### `aplicarSnapshot(snap, { fuente })` — el flujo de restaurar

Reemplazo total, con copia de seguridad previa. No es atómico (varias tablas
desde el navegador); las mitigaciones son la copia previa y una confirmación
explícita.

1. **Confirmación:** `window.confirm` con texto claro: "Restaurar reemplaza
   TODA tu colección, bitácora y fotos actuales por las de esta copia. Antes se
   guarda una copia automática del estado actual."
2. **Copia previa:** `crearCopia('Antes de restaurar (' + fecha + ')')`. Si
   falla, se avisa con `showError` y se pide una segunda confirmación para
   seguir sin red.
3. **Borrado de lo vivo**, en orden de dependencias:
   `coleccion_cuidados` (por `coleccion_id`) → `coleccion_fotos` (por
   `coleccion_id`) → `user_collection` (por `user_id`). Después
   `storage.remove()` de todos los binarios vivos `{uid}/coleccion/...` que
   figuraban antes.
4. **Reinserción:** `user_collection` con los mismos `id`; después
   `coleccion_cuidados` y `coleccion_fotos` con sus filas.
5. **Binarios:** por cada foto, si `fuente === 'nube'`
   `storage.copy(backup_path → storage_path)`; si `fuente === 'archivo'`
   `storage.upload(storage_path, blobDesdeBase64)`.
6. `limpiarCacheColeccion()` y recarga de la vista (`window.location.reload()`
   basta: Ajustes no muestra la colección).

Feedback con `showError` / `showStatus` de `js/utils/dom.js`. Sin librería de
toasts nueva.

### `ajustes.html`

Mismo layout que `riegos.html`: `<header class="catalog-header">` con
`catalog-nav`, `catalog-meta` (reloj, toggle de tema, `[data-auth-nav]`),
`<aside class="catalog-sidebar">`, y el modal `#dialog-auth` (para el caso sin
sesión). Se suma `ajustes.html` a los tres bloques de navegación
(`catalog-nav`, `catalog-sidebar-nav`) de **todas** las páginas junto con el
resto de los links.

Contenido propio:

- `#ajustes-sin-sesion` (hidden por defecto): "Iniciá sesión para gestionar tus
  copias de seguridad." + botón que abre el modal de auth.
- `#ajustes-contenido` (hidden por defecto):
  - Párrafo explicativo: qué es una copia, qué guarda (colección, bitácora,
    fotos), y que restaurar reemplaza todo.
  - Botones: **Crear copia ahora**, **Descargar copia (.json)**,
    **Restaurar desde archivo** (`<label>` con `<input type="file"
    accept="application/json,.json" hidden>`).
  - `#ajustes-error` para errores (`field-error`).
  - `#lista-copias`: una fila por copia con fecha formateada, etiqueta, botón
    **Restaurar** y botón de borrar.

### `js/pages/ajustes.js`

- `wireAuthNav`, `wireAuthModal`, reloj y toggle de tema como en las otras
  páginas.
- Al cargar: `getSession()`. Sin sesión → muestra `#ajustes-sin-sesion` y
  cablea el botón para abrir el modal; al volver con sesión, re-renderiza.
- Con sesión → muestra `#ajustes-contenido`, cablea los botones al servicio,
  renderiza la lista y dispara `autoBackupSiCorresponde()` (sin await
  bloqueante; refresca la lista cuando termina).
- Render de la lista: fecha con
  `toLocaleString('es-AR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })`.

### `js/utils/auth-nav.js`

El link "Ajustes" va en el markup de cada página (header y sidebar), como
hermano del botón `[data-auth-nav]`, con `data-ajustes-link` y `hidden` por
defecto:

```html
<a class="catalog-auth-btn" href="ajustes.html" data-ajustes-link hidden>Ajustes</a>
```

`sync()` en `auth-nav.js` ya calcula `haySesion`; se le suma togglear el
`hidden` de los `[data-ajustes-link]` con ese mismo valor. Se elige markup en la
página (no crear el nodo desde JS) para seguir el patrón que ya usa
`[data-auth-nav]`: el DOM está en el HTML, el JS solo cambia estado.

## Manejo de errores

- **Tabla ausente (`error.code === '42P01'`):** los botones de nube muestran
  "La tabla `user_backups` todavía no existe. Hay que correr la migración
  `supabase/migrations/0005_user_backups.sql`." **Descargar `.json`** sigue
  funcionando porque no toca esa tabla. Mismo criterio que finanzapp.
- **Restauración cortada a la mitad:** la copia `'Antes de restaurar'` del paso
  2 permite volver. El texto de confirmación lo dice.
- **`storage.copy` / `upload` que falla en una foto:** no aborta la
  restauración de datos; se cuenta y al final se avisa "N fotos no se pudieron
  restaurar" con `showError`. Las filas de `coleccion_fotos` quedan igual (con
  link roto) para no perder el registro de que esa foto existía.
- **`localStorage` no disponible (modo privado):** `autoBackupSiCorresponde()`
  cae en el chequeo por tabla; si tampoco, hace una copia de más ese día, sin
  romper nada.
- **Archivo `.json` inválido:** `validarSnapshot` devuelve el motivo y se
  muestra con `showError`; no se toca ningún dato.

## Testing

- `js/utils/backup-snapshot.test.js` (`npm test`, `node --test`): cubre
  `validarSnapshot`, `debeHacerAutoBackup`, `copiasAPodar`,
  `nombreArchivoDescarga`.
- El servicio `backups.js` y `ajustes.js` no tienen tests automáticos (el
  proyecto solo testea `js/utils/*`). Verificación manual: crear copia, ver que
  aparece en la lista, borrar una planta, restaurar, confirmar que vuelve con
  sus cuidados y fotos; descargar `.json` y restaurarlo en una sesión limpia.

## Riesgos y decisiones

- **Espacio en Storage:** con copia automática diaria conservando 7, las copias
  ocupan ~7× el peso de las fotos del usuario, más las copias manuales y las
  previas a restaurar. Se acepta; `CONSERVAR_AUTO` es una constante fácil de
  bajar. La poda solo aplica a las automáticas: las manuales las borra el
  usuario.
- **No atómico:** asumido y mitigado con la copia previa. Una transacción real
  necesitaría una función RPC en Postgres; queda fuera de alcance.
- **`id` reusados en la reinserción:** se reinsertan con los mismos UUID que
  tenían. Como el paso 3 los borró antes, no hay colisión de PK.
