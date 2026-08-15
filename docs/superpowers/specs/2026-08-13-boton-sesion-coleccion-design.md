# Botón de sesión en Colección

Fecha: 2026-08-13

## Problema

La página Colección no ofrecía ninguna forma de cerrar sesión. Tampoco se podía
ver estando deslogueado: `init()` abría el modal de login apenas cargaba y, si se
cerraba el modal, redirigía a `index.html`. El estado "sin sesión" era
inalcanzable, así que un botón "Iniciar sesión" nunca se habría mostrado.

## Solución

Un botón en el header/sidebar, debajo de la fecha y horario, que muestra
"Cerrar sesión" con sesión activa e "Iniciar sesión" sin ella.

### Ubicación

La fecha vive en dos lugares y solo uno es visible según el viewport, así que el
botón se duplica para acompañarla:

| Viewport | Contenedor | Botón |
| --- | --- | --- |
| > 1024px | `.catalog-meta` (header) | `.catalog-auth-btn` |
| ≤ 1024px | `.catalog-sidebar-datetime` (menú) | `.catalog-sidebar-auth-btn` |

A ≤1024px `.catalog-meta` pasa a `display: contents`, por lo que sus hijos caen
sueltos en el grid del header. Por eso `.catalog-auth-btn` se oculta ahí de forma
explícita, igual que ya se ocultaba la fecha del header.

### `js/utils/auth-nav.js`

`wireAuthNav({ onLogin })` maneja los dos botones juntos vía `[data-auth-nav]` en
vez de por id. Consulta `getSession()` y escribe texto y estado en
`data-auth-nav-state`.

- Con sesión → `signOut()` y navegar a `index.html`, igual que el logout del
  dashboard.
- Sin sesión → `onLogin()`, que abre el modal de auth existente.
- Si `getSession()` falla, cae al estado "Iniciar sesión": ofrecer cerrar una
  sesión que no existe no produciría ningún efecto visible.

Devuelve `{ sync }` para re-sincronizar después de un login sin recargar.

### Cambios en `js/pages/coleccion.js`

Se elimina el redirect. La página se muestra siempre; sin sesión queda vacía con
el mensaje "Iniciá sesión para ver las plantas de tu colección".

El arranque se parte en dos: `montarChrome()` (menú, filtros, borrado) corre una
sola vez, y `activarColeccion()` (render + suscripción realtime) corre cuando hay
sesión — al cargar o después de un login. Un flag evita suscribirse dos veces.

### Cambios en `js/services/coleccion.js`

Sin sesión, `leerDeSupabase()` devolvía el cache de `localStorage`, que pertenece
al último usuario logueado. Con la página visible sin sesión eso dejaría la
colección de otro usuario a la vista, así que ahora devuelve `[]`.

Además se agrega `limpiarCacheColeccion()`, que vacía el cache en memoria y el de
`localStorage`. El cache no está scopeado por usuario, así que se llama en dos
puntos:

- En el logout de `auth-nav.js`, apenas se cierra la sesión.
- En `leerDeSupabase()` cuando no hay sesión, que además cubre las sesiones
  vencidas y cualquier otra ruta de logout.

Sin esto, la rama de error de `leerDeSupabase()` podía devolverle a un segundo
usuario la colección del primero ante un fallo de red.

## Sincronización entre dispositivos

Supabase es la única fuente de verdad: `agregarAColeccion()` inserta con
`user_id` y las lecturas filtran por `session.user.id`. No hay ninguna ruta que
escriba solo en `localStorage`, así que iniciar sesión en otro dispositivo trae
la colección completa. El cache local es solo un respaldo ante fallos de red.

## Sin cubrir por tests

`limpiarCacheColeccion()` y el estado sin sesión no tienen tests automatizados:
`npm test` solo corre `js/utils/*.test.js`, que son utilidades puras sin
dependencia de `localStorage` ni del cliente de Supabase.
