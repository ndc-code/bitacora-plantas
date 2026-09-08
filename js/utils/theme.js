import { qsa } from './dom.js';

export const TEMA_DIA = 'light';
export const TEMA_NOCHE = 'dark';

// El cartel dice la hora de Buenos Aires: el momento del día se calcula
// siempre sobre esa ciudad, no la local del dispositivo.
const ZONA = 'America/Argentina/Buenos_Aires';

const formatoHoraZona = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  hour: '2-digit',
  hour12: false,
});

// El texto nombra el estado actual, no una acción.
export function etiquetaParaTema(tema) {
  if (tema === TEMA_NOCHE) return 'Noche';
  return 'Día';
}

/**
 * Momento del día según la hora de Buenos Aires, con corte fijo (no salida ni
 * puesta de sol reales): Día 06–18, Noche 18–06.
 */
export function momentoActual(date = new Date()) {
  // `hour: '2-digit'` con `hour12: false` puede devolver "24" a medianoche
  // en algunos motores; el `% 24` lo normaliza a 0.
  const hora = Number(formatoHoraZona.format(date)) % 24;
  return hora >= 6 && hora < 18 ? TEMA_DIA : TEMA_NOCHE;
}

/**
 * Fija el `data-theme` de `<html>` al momento del día real y refleja su
 * nombre en los `[data-theme-toggle]`. El reloj (js/utils/reloj.js) la llama
 * en cada tick de minuto, así el tema cambia solo al cruzar un corte horario
 * con la página abierta.
 */
export function aplicarMomentoTema(date = new Date()) {
  const raiz = document.documentElement;
  const tema = momentoActual(date);
  if (tema === TEMA_DIA) {
    raiz.removeAttribute('data-theme');
  } else {
    raiz.setAttribute('data-theme', tema);
  }
  qsa('[data-theme-toggle]').forEach((el) => {
    el.textContent = etiquetaParaTema(tema);
  });
  return tema;
}

/**
 * Aplica el momento del día una vez al cargar la página. Ya no hay ciclado
 * manual: el usuario no elige el tema, lo marca el reloj.
 */
export function wireThemeToggle() {
  aplicarMomentoTema();
}
