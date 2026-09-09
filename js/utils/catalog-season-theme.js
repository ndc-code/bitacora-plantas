import { qsa } from './dom.js';
import { estacionActualTema } from './reloj.js';

function sinAcentos(str) {
  return str.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Fija el `data-season` de `<html>` a la estación real (por mes calendario,
 * hemisferio sur — ver `estacionActualTema`) y refleja su nombre en los
 * `[data-estacion-tema]`. El reloj (js/utils/reloj.js) la llama en cada tick
 * de minuto, así el tema cambia solo al cambiar de mes con la página abierta.
 */
export function aplicarEstacionTema(date = new Date()) {
  const estacion = estacionActualTema(date);
  document.documentElement.setAttribute('data-season', sinAcentos(estacion));
  qsa('[data-estacion-tema]').forEach((el) => {
    el.textContent = estacion;
  });
  return estacion;
}

/**
 * Aplica la estación real una vez al cargar la página. Ya no hay ciclado
 * manual: el usuario no elige la estación, la marca el calendario.
 */
export function wireSeasonTheme() {
  aplicarEstacionTema();
}
