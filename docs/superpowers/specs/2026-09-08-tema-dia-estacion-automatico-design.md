# Tema automático por día y estación + reloj estilo Filotaxia

Fecha: 2026-09-08
Estado: aprobado para plan

## Problema

El sitio tiene hoy un toggle día/noche manual y persistido, y un reloj que solo
muestra la hora ("Buenos Aires, ARG 23:46"). El proyecto de referencia
`inspo/bitacora-filotaxia` resuelve esto de otra forma: el tema lo marca el
reloj de Buenos Aires (día/noche por hora, estación por mes), el usuario no
elige nada, y la paleta entera del sitio se tiñe con el color de la estación.
Este cambio porta ese sistema.

## Alcance

Incluye:

- Tema día/noche 100% automático por hora de Buenos Aires (Día 06–18, Noche
  18–06). Se elimina el toggle manual y el `localStorage`.
- Tema por estación: `data-season` en `<html>` (invierno/primavera/verano/otono)
  por mes calendario del hemisferio sur, que tiñe todo el texto del sitio con
  el color de la estación.
- Reloj en formato `"19:18 AR 08 SEP 2026"` y, al lado, `Estación · Momento`.
- Re-aplicación automática en cada tick de minuto (cambia solo al cruzar un
  minuto, un corte horario o un cambio de mes).
- Cambio instantáneo, sin transición CSS.

No incluye:

- Cortes por salida/puesta de sol reales (se usan cortes fijos 06/18).
- Fechas exactas de equinoccio/solsticio (se agrupa por mes calendario).
- Cualquier control de usuario sobre el tema.

## Comportamiento (portado de `inspo/bitacora-filotaxia`)

### Momento del día — `js/utils/theme.js`

- `TEMA_DIA = 'light'`, `TEMA_NOCHE = 'dark'`.
- `momentoActual(date)` → `TEMA_DIA` si la hora de Buenos Aires está en
  `[6, 18)`, si no `TEMA_NOCHE`.
- `aplicarMomentoTema(date)` → si es día, quita `data-theme` de `<html>`; si es
  noche, lo pone en `'dark'`. Pinta el `textContent` de los
  `[data-theme-toggle]` con `etiquetaParaTema` ("Día" / "Noche").
- `etiquetaParaTema(tema)` → "Día" | "Noche" (nombra el estado, no una acción).
- `wireThemeToggle()` → llama a `aplicarMomentoTema()` una vez. Sin listeners,
  sin `localStorage`. Se conserva el nombre para no tocar los imports de las
  páginas.

Se eliminan: `temaOpuesto`, `TEMA_CLARO`/`TEMA_OSCURO` (renombrados),
`CLAVE_STORAGE`, `guardarTema`, el `onClick`.

### Estación — `js/utils/reloj.js` + `js/utils/catalog-season-theme.js`

`reloj.js`:

- `ZONA = 'America/Argentina/Buenos_Aires'`, `LOCALE = 'es-AR'`.
- `ESTACIONES` = arreglo de 12 (índice 0 = enero): Verano, Verano, Otoño,
  Otoño, Otoño, Invierno, Invierno, Invierno, Invierno, Primavera, Primavera,
  Verano.
- `estacionActualTema(date)` → `ESTACIONES[mes-1]` con el mes de Buenos Aires.
- `formatearHoraCompleta(date)` → `"19:18 AR 08 SEP 2026"`: hora 24h, literal
  "AR", día con 2 dígitos, mes abreviado a 3 letras sin punto en mayúscula,
  año. (es-AR abrevia septiembre como "sept." → se saca el punto y se recorta
  a 3.)
- `formatearFechaEstacion(date)` → `"13 ago Invierno"` (día + mes corto +
  estación).
- `msHastaProximoMinuto(date)` → sin cambios respecto del actual.
- `wireReloj()` → cada minuto: pinta `[data-hora-completa]` con
  `formatearHoraCompleta` (y `datetime` ISO si es `<time>`), y llama a
  `aplicarEstacionTema(ahora)` y `aplicarMomentoTema(ahora)`.

Se eliminan: `formatearFechaHora`, `formatoFecha`/`formatoHora` viejos, el uso
de `[data-reloj]`.

`catalog-season-theme.js` (nuevo):

- `aplicarEstacionTema(date)` → fija `data-season` en `<html>` con el nombre de
  la estación sin acentos y en minúscula (`otoño` → `otono`), y pinta los
  `[data-estacion-tema]` con el nombre con acento. Devuelve la estación.
- `wireSeasonTheme()` → llama a `aplicarEstacionTema()` una vez (para páginas
  que no montan el reloj, como `planta.html`).

Import circular `reloj.js` ↔ `catalog-season-theme.js`: lo resuelven los
módulos ES (igual que en la inspo).

## CSS — `css/styles.css`

Después del bloque `:root[data-theme='dark']`, se agregan los bloques de la
inspo:

```css
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
:root[data-season='verano']:not([data-theme='dark']) {
  --color-ink: #000000;
}
```

- `data-season` está siempre presente (lo pone el script anti-flash), así que
  `--color-ink` es siempre el color de la estación (salvo verano de día).
- El dark canvas pasa de `#141413` (base) a `#000000` cuando hay `data-season`
  — fiel a la inspo. (Punto reversible si se prefiere el negro suave.)
- Sin `transition`: el cambio es instantáneo.
- Se agrega `.catalog-theme-label { line-height: 1; }`. `.catalog-theme-toggle-sep`
  ya existe.
- Auditar el header/nav por `#000`/`#fff`/`black`/`white` hardcodeados que
  anulen el tinte; pasarlos a `var(--color-ink)` / `var(--color-canvas)`.

## `<head>` anti-flash — las 6 páginas

`index.html`, `coleccion.html`, `riegos.html`, `bitacora.html`, `ajustes.html`,
`planta.html`. Se reemplaza:

```js
try {
  if (localStorage.getItem('tema') === 'dark')
    document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
```

por el de la inspo (calcula mes y hora de Buenos Aires con `Intl`, fija
`data-season` siempre y `data-theme='dark'` si es de noche, antes del primer
paint).

## Navbar

### `.catalog-meta` (index, coleccion, riegos, bitacora, ajustes)

De un `<p>` con `Buenos Aires, ARG <time data-reloj> · <button data-theme-toggle>`
a dos `<p>`:

```html
<p><time data-hora-completa>00:00 AR 01 ENE 2026</time></p>
<p>
  <span class="catalog-theme-label" data-estacion-tema>Invierno</span>
  <span class="catalog-theme-toggle-sep" aria-hidden="true">·</span>
  <span class="catalog-theme-label" data-theme-toggle>Noche</span>
</p>
```

El `<button ... data-theme-toggle>` deja de ser botón: pasa a `<span
class="catalog-theme-label" data-theme-toggle>`.

### Sidebar

- `.catalog-sidebar-datetime` (el `<p>` con `Buenos Aires, ARG <time
  data-reloj>`): pasa a `<time data-hora-completa>`.
- `.catalog-sidebar-top`: el `<button data-theme-toggle>` pasa a `<span
  class="catalog-theme-label" data-theme-toggle>`, y se le suma
  `<span data-estacion-tema>` con separador.

### `planta.html` (`.topbar`)

El `<button class="catalog-theme-toggle" data-theme-toggle>` pasa a `<span
class="catalog-theme-label" data-theme-toggle>`, y se suma `<time
data-hora-completa>` + `<span data-estacion-tema>`. `planta.js` monta
`wireReloj()` además de `wireThemeToggle()`.

Se eliminan todas las referencias a `[data-reloj]` y a
`class="catalog-theme-toggle"` como botón (el estilo de label lo da
`.catalog-theme-label`). Los `aria-pressed` se sacan (ya no es un control).

## Tests

- `js/utils/reloj.test.js` — reemplazado por el de la inspo:
  `formatearFechaEstacion`, `formatearHoraCompleta` (incluye el caso "sept."),
  `estacionActualTema` (hemisferio sur, huso de Buenos Aires),
  `msHastaProximoMinuto`.
- `js/utils/theme.test.js` — reemplazado por el de la inspo: `etiquetaParaTema`,
  `momentoActual` (cortes 06/18, huso de Buenos Aires).
- `catalog-season-theme.js` no lleva test propio (su lógica de estación vive en
  `reloj.js`, ya cubierta).
- Verificación manual: abrir cada página, confirmar que el reloj dice
  `"HH:MM AR DD MMM AAAA"`, que el texto toma el color de la estación, y que de
  noche el fondo es negro. Forzar `data-season`/`data-theme` por consola para
  ver las 4 estaciones × 2 momentos.

## Riesgos

- **Legibilidad**: verano de día ya está resuelto (texto negro). Invierno
  (azul), primavera (verde) y otoño (rojo) sobre blanco y sobre negro tienen
  contraste suficiente; es el mismo criterio que la inspo en producción.
- **`#141413` → `#000000` en dark**: cambio deliberado para igualar la inspo;
  un solo valor si se quiere volver atrás.
- **Import circular** `reloj.js` ↔ `catalog-season-theme.js`: soportado por ES
  modules; la inspo lo usa igual.
