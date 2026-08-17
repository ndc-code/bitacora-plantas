import { qsa } from './dom.js';

const CLAVE_STORAGE = 'tema';
export const TEMA_CLARO = 'light';
export const TEMA_OSCURO = 'dark';

export function temaOpuesto(tema) {
  return tema === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
}

// El botón nombra la acción, no el estado actual: en modo claro invita a
// pasar a "Noche", y viceversa.
export function etiquetaParaTema(tema) {
  return tema === TEMA_OSCURO ? 'Día' : 'Noche';
}

function guardarTema(tema) {
  try {
    localStorage.setItem(CLAVE_STORAGE, tema);
  } catch {
    // Navegación privada o storage lleno: el toggle sigue funcionando en la
    // sesión actual, solo no persiste entre recargas.
  }
}

function pintarBotones(botones, tema) {
  botones.forEach((boton) => {
    boton.textContent = etiquetaParaTema(tema);
    boton.setAttribute('aria-pressed', String(tema === TEMA_OSCURO));
  });
}

/**
 * Sincroniza los botones `[data-theme-toggle]` de la página con el
 * `data-theme` ya aplicado en `<html>` (lo pone el script inline anti-flash
 * del `<head>`) y los conecta para alternarlo. Devuelve una función para
 * desconectarlos.
 */
export function wireThemeToggle() {
  const botones = qsa('[data-theme-toggle]');
  if (botones.length === 0) return () => {};

  const raiz = document.documentElement;

  function temaActual() {
    return raiz.getAttribute('data-theme') === TEMA_OSCURO ? TEMA_OSCURO : TEMA_CLARO;
  }

  pintarBotones(botones, temaActual());

  function onClick() {
    const siguiente = temaOpuesto(temaActual());
    raiz.setAttribute('data-theme', siguiente);
    guardarTema(siguiente);
    pintarBotones(botones, siguiente);
  }

  botones.forEach((boton) => boton.addEventListener('click', onClick));

  return () => {
    botones.forEach((boton) => boton.removeEventListener('click', onClick));
  };
}
