import { getSession } from '../services/auth.js';
import { qs } from './dom.js';

/**
 * Devuelve la sesión activa o redirige al login. Compartida por dashboard.js y
 * planta.js para no duplicar la misma guardia en cada página.
 */
export async function requerirSesion() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

function contenedorErrorDePagina() {
  const existente = qs('#error-pagina');
  if (existente) return existente;

  const el = document.createElement('p');
  el.id = 'error-pagina';
  el.className = 'field-error';
  el.hidden = true;
  const destino = qs('main') ?? document.body;
  destino.prepend(el);
  return el;
}

/**
 * Muestra un mensaje de error a nivel de página (arriba del `<main>`), para que
 * un fallo de carga no deje la pantalla en blanco.
 * `enlace` opcional: `{ href, texto }`.
 */
export function mostrarErrorDePagina(mensaje, enlace = null) {
  const el = contenedorErrorDePagina();
  el.textContent = mensaje;
  if (enlace) {
    el.append(' ');
    const a = document.createElement('a');
    a.href = enlace.href;
    a.textContent = enlace.texto;
    el.append(a);
  }
  el.hidden = false;
  return el;
}

/**
 * Envuelve el arranque de una página: si algo falla, muestra el error inline en
 * lugar de dejar una promesa rechazada y una página vacía.
 */
export async function iniciarPagina(fn) {
  try {
    await fn();
  } catch (err) {
    console.error('Error al iniciar la página', err);
    mostrarErrorDePagina(`No pudimos cargar esta página: ${err?.message ?? 'error desconocido'}`);
  }
}
