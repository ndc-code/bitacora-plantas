import { getSession, signOut } from '../services/auth.js';
import { limpiarCacheColeccion } from '../services/coleccion.js';
import { qsa } from './dom.js';

/**
 * Botón de sesión del header/sidebar. Hay uno por layout (header en desktop,
 * sidebar en ≤1024px) y solo uno es visible a la vez, así que los manejamos
 * juntos con `[data-auth-nav]` en vez de por id.
 *
 * `onLogin` se dispara cuando no hay sesión: la página decide cómo pedirla
 * (acá, abrir el modal de auth que ya existe).
 */
export function wireAuthNav({ onLogin } = {}) {
  const botones = qsa('[data-auth-nav]');
  if (botones.length === 0) return { sync: async () => {} };

  async function handleClick(event) {
    const btn = event.currentTarget;
    if (btn.disabled) return;

    if (btn.dataset.authNavState !== 'in') {
      if (onLogin) onLogin();
      return;
    }

    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Cerrando…';

    try {
      await signOut();
      limpiarCacheColeccion();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error cerrando sesión', error);
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }

  botones.forEach((btn) => btn.addEventListener('click', handleClick));

  async function sync() {
    let haySesion = false;
    try {
      haySesion = Boolean(await getSession());
    } catch (error) {
      // Sin poder confirmar la sesión, ofrecer iniciarla es el estado seguro:
      // "Cerrar sesión" sobre una sesión que no existe no haría nada visible.
      console.error('Error leyendo la sesión', error);
    }

    botones.forEach((btn) => {
      btn.dataset.authNavState = haySesion ? 'in' : 'out';
      btn.textContent = haySesion ? 'Cerrar sesión' : 'Iniciar sesión';
      btn.disabled = false;
    });
  }

  return { sync };
}
