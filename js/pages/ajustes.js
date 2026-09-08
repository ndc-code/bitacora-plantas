import { qs, showError, clearError, showStatus, clearStatus, escapeHtml } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { wireThemeToggle } from '../utils/theme.js';
import { iniciarPagina } from '../utils/guard.js';
import {
  listarCopias,
  crearCopia,
  borrarCopia,
  restaurarCopia,
  descargarArchivo,
  leerArchivoDeCopia,
  restaurarDesdeSnapshot,
  autoBackupSiCorresponde,
  errorTablaAusente,
} from '../services/backups.js';

const MSG_TABLA_AUSENTE =
  'La tabla de copias todavía no existe en Supabase. Hay que correr la migración ' +
  'supabase/migrations/0005_user_backups.sql. Mientras tanto podés usar «Descargar copia (.json)».';

const authModal = wireAuthModal();
const authNav = wireAuthNav({ onLogin: abrirLogin });

function errorEl() { return qs('#ajustes-error'); }
function estadoEl() { return qs('#ajustes-estado'); }

function mensajeDe(e) {
  return `No se pudo completar la operación: ${e?.message ?? 'error desconocido'}`;
}
function mostrarError(e) {
  showError(errorEl(), errorTablaAusente(e) ? MSG_TABLA_AUSENTE : mensajeDe(e));
}
function limpiarMensajes() {
  clearError(errorEl());
  clearStatus(estadoEl());
}

function abrirLogin() {
  authModal.open({
    onSuccess: async () => {
      await authNav.sync();
      await entrar();
    },
  });
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function renderLista() {
  const box = qs('#lista-copias');
  box.innerHTML = '<p class="ajustes-nota">Cargando copias…</p>';
  let copias;
  try {
    copias = await listarCopias();
  } catch (e) {
    box.innerHTML = '';
    mostrarError(e);
    return;
  }
  if (!copias.length) {
    box.innerHTML = '<p class="ajustes-nota">Todavía no hay copias. Creá la primera con el botón de arriba.</p>';
    return;
  }
  box.innerHTML = copias
    .map((c) => `
      <div class="ajustes-copia-row" data-id="${escapeHtml(c.id)}">
        <div class="ajustes-copia-main">
          <div class="ajustes-copia-when">${escapeHtml(formatearFecha(c.created_at))}</div>
          <div class="ajustes-copia-label">${escapeHtml(c.label || 'Copia')} · ${c.photo_count || 0} foto(s)</div>
        </div>
        <button type="button" class="btn btn-secondary" data-accion="restaurar">Restaurar</button>
        <button type="button" class="btn btn-secondary" data-accion="borrar" aria-label="Borrar copia">Borrar</button>
      </div>
    `)
    .join('');
}

async function onCrearCopia() {
  limpiarMensajes();
  if (!window.confirm('¿Crear una copia de seguridad ahora con el estado actual?')) return;
  const btn = qs('#btn-crear-copia');
  btn.disabled = true;
  try {
    await crearCopia('Copia manual');
    showStatus(estadoEl(), 'Copia de seguridad creada.');
    await renderLista();
  } catch (e) {
    mostrarError(e);
  } finally {
    btn.disabled = false;
  }
}

async function onDescargar() {
  limpiarMensajes();
  const btn = qs('#btn-descargar-copia');
  btn.disabled = true;
  try {
    showStatus(estadoEl(), 'Preparando el archivo…');
    await descargarArchivo();
    showStatus(estadoEl(), 'Archivo descargado.');
  } catch (e) {
    mostrarError(e);
  } finally {
    btn.disabled = false;
  }
}

async function onRestaurarArchivo(input) {
  limpiarMensajes();
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;

  let snapshot;
  try {
    snapshot = await leerArchivoDeCopia(file);
  } catch (e) {
    showError(errorEl(), `No se pudo restaurar: ${e.message}`);
    return;
  }
  if (!window.confirm(
    'Restaurar desde este archivo reemplaza TODA tu colección, bitácora y fotos ' +
    'actuales. Antes se guarda una copia automática del estado actual. ¿Seguir?',
  )) return;

  try {
    showStatus(estadoEl(), 'Restaurando…');
    const { fotosFallidas } = await restaurarDesdeSnapshot(snapshot, { fuente: 'archivo' });
    avisarRestauracion(fotosFallidas);
    await renderLista();
  } catch (e) {
    mostrarError(e);
  }
}

async function onListaClick(event) {
  const btn = event.target.closest('button[data-accion]');
  if (!btn) return;
  const row = btn.closest('.ajustes-copia-row');
  const id = row?.dataset.id;
  if (!id) return;
  limpiarMensajes();

  if (btn.dataset.accion === 'borrar') {
    if (!window.confirm('¿Borrar esta copia de seguridad? Tus datos actuales no se tocan.')) return;
    try {
      await borrarCopia(id);
      showStatus(estadoEl(), 'Copia borrada.');
      await renderLista();
    } catch (e) {
      mostrarError(e);
    }
    return;
  }

  if (btn.dataset.accion === 'restaurar') {
    if (!window.confirm(
      'Restaurar esta copia reemplaza TODA tu colección, bitácora y fotos ' +
      'actuales por las de la copia. Antes se guarda una copia automática del ' +
      'estado actual, así que se puede volver. ¿Restaurar?',
    )) return;
    try {
      showStatus(estadoEl(), 'Restaurando…');
      const { fotosFallidas } = await restaurarCopia(id);
      avisarRestauracion(fotosFallidas);
      await renderLista();
    } catch (e) {
      mostrarError(e);
    }
  }
}

function avisarRestauracion(fotosFallidas) {
  if (fotosFallidas > 0) {
    showError(errorEl(), `Datos restaurados, pero ${fotosFallidas} foto(s) no se pudieron reponer.`);
  } else {
    showStatus(estadoEl(), 'Datos restaurados. Recargá la colección para verlos.');
  }
}

function wireSidebarToggle() {
  const toggle = qs('#catalog-menu-toggle');
  if (!toggle) return;
  const sidebar = qs('#catalog-sidebar');
  const cerrar = () => {
    sidebar?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');
  };
  toggle.addEventListener('click', () => {
    const abierto = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', abierto);
    document.body.classList.toggle('sidebar-open', abierto);
  });
  qs('#catalog-sidebar-close')?.addEventListener('click', cerrar);
}

async function entrar() {
  const haySesion = Boolean(await getSession());
  qs('#ajustes-sin-sesion').hidden = haySesion;
  qs('#ajustes-contenido').hidden = !haySesion;
  if (!haySesion) return;

  await renderLista();
  autoBackupSiCorresponde().then(() => renderLista()).catch(() => {});
}

iniciarPagina(async function init() {
  wireReloj();
  wireThemeToggle();
  wireSidebarToggle();
  await authNav.sync();

  qs('#btn-abrir-login-ajustes')?.addEventListener('click', abrirLogin);
  qs('#btn-crear-copia').addEventListener('click', onCrearCopia);
  qs('#btn-descargar-copia').addEventListener('click', onDescargar);
  qs('#input-restaurar-archivo').addEventListener('change', (e) => onRestaurarArchivo(e.target));
  qs('#lista-copias').addEventListener('click', onListaClick);

  await entrar();
});
