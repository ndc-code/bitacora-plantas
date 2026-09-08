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
 * Milisegundos que faltan para el próximo minuto redondo. Se reprograma con
 * este valor en vez de un intervalo fijo de 60s para que el reloj cambie
 * cuando cambia el minuto real, y no con el desfase que tuviera al cargar.
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
