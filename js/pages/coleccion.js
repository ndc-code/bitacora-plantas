import { qs } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { listarColeccion, quitarDeColeccion, onColeccionChange } from '../services/coleccion.js';
import { entryMarkup, idDeColeccion } from '../utils/coleccion-card.js';
import { syncColeccionNavCount } from '../utils/coleccion-nav.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { wireThemeToggle } from '../utils/theme.js';
import { iniciarPagina, mostrarErrorDePagina } from '../utils/guard.js';

async function render(root) {
  const vacio = qs('#mensaje-vacio');
  if (!root || !vacio) return;

  const plantas = await listarColeccion();
  root.innerHTML = '';

  if (plantas.length === 0) {
    vacio.hidden = false;
    await syncColeccionNavCount();
    return;
  }

  vacio.hidden = true;

  for (const planta of plantas) {
    const entry = document.createElement('div');
    entry.className = 'catalog-entry';
    entry.dataset.id = idDeColeccion(planta);
    entry.dataset.nombre = planta.nombre || '';
    entry.innerHTML = entryMarkup(planta);
    root.appendChild(entry);
  }

  mostrarPreviewInicial(root);
  await syncColeccionNavCount();
}

function mostrarPreviewInicial(root) {
  const preview = qs('#coleccion-preview');
  const previewImg = qs('#coleccion-preview-img');
  const primerLink = root.querySelector('.coleccion-row-link');
  if (!preview || !previewImg || !primerLink) return;

  const imagen = primerLink.dataset.imagen;
  if (!imagen) return;

  previewImg.src = imagen;
  previewImg.alt = primerLink.querySelector('.coleccion-row-text')?.textContent || '';
  preview.classList.add('is-visible');
}

function wirePreview(root) {
  const preview = qs('#coleccion-preview');
  const previewImg = qs('#coleccion-preview-img');
  if (!root || !preview || !previewImg) return;

  root.addEventListener('mouseover', (event) => {
    const link = event.target.closest('.coleccion-row-link');
    if (!link || !root.contains(link)) return;

    const imagen = link.dataset.imagen;
    if (!imagen) return;

    previewImg.src = imagen;
    previewImg.alt = link.querySelector('.coleccion-row-text')?.textContent || '';
    preview.classList.add('is-visible');
  });

  root.addEventListener('mouseout', (event) => {
    const link = event.target.closest('.coleccion-row-link');
    if (!link || !root.contains(link)) return;
    if (link.contains(event.relatedTarget)) return;

    preview.classList.remove('is-visible');
  });
}

function wireEliminar(root) {
  if (!root) return;

  root.addEventListener('click', async (event) => {
    const btn = event.target.closest('.coleccion-eliminar-btn');
    if (!btn || !root.contains(btn)) return;

    event.preventDefault();
    event.stopPropagation();

    const id = btn.dataset.id;
    if (!id) return;
    if (btn.disabled) return;

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Eliminando…';

    try {
      const result = await quitarDeColeccion(id);

      if (result.ok || result.reason === 'missing') {
        await render(root);
        return;
      }

      btn.disabled = false;
      btn.textContent = textoOriginal;
      mostrarErrorDePagina(
        result.reason === 'not_authenticated'
          ? 'Iniciá sesión de nuevo para editar tu colección.'
          : 'No pudimos eliminar la planta de tu colección. Probá otra vez.'
      );
    } catch (error) {
      console.error('Error eliminando de la colección', error);
      btn.disabled = false;
      btn.textContent = textoOriginal;
      mostrarErrorDePagina('No pudimos eliminar la planta de tu colección. Probá otra vez.');
    }
  });
}

function toggleSidebar() {
  const sidebar = qs('#catalog-sidebar');
  const toggle = qs('#catalog-menu-toggle');
  if (!sidebar || !toggle) return;

  const isOpen = sidebar.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', isOpen);
  document.body.classList.toggle('sidebar-open', isOpen);
}

function closeSidebar() {
  const sidebar = qs('#catalog-sidebar');
  const toggle = qs('#catalog-menu-toggle');
  if (!sidebar || !toggle) return;

  sidebar.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sidebar-open');
}

function wireSidebarToggle() {
  const toggle = qs('#catalog-menu-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', toggleSidebar);

  const closeBtn = qs('#catalog-sidebar-close');
  closeBtn?.addEventListener('click', closeSidebar);

  const backdrop = document.body;
  backdrop.addEventListener('click', (event) => {
    const sidebar = qs('#catalog-sidebar');
    if (sidebar && sidebar.classList.contains('is-open') && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
      closeSidebar();
    }
  });
}

const MENSAJE_SIN_PLANTAS =
  'Todavía no hay plantas en tu colección. Sumá algunas desde Index con (Agregar).';
const MENSAJE_SIN_SESION = 'Iniciá sesión para ver las plantas de tu colección.';

const root = qs('#coleccion-rows');
const authModal = wireAuthModal();
const authNav = wireAuthNav({ onLogin: abrirLogin });

let coleccionActiva = false;

function abrirLogin() {
  authModal.open({
    onSuccess: async () => {
      await authNav.sync();
      activarColeccion();
    },
  });
}

/**
 * Listeners que no dependen de la sesión (menú, filtros, borrado). Se montan una
 * sola vez: si alguien inicia sesión sin recargar, `activarColeccion` vuelve a
 * correr pero esto no.
 */
function montarChrome() {
  wireReloj();
  wireThemeToggle();
  wireEliminar(root);
  wireSidebarToggle();
  wirePreview(root);
}

function mostrarEstadoSinSesion() {
  if (root) root.innerHTML = '';
  const vacio = qs('#mensaje-vacio');
  if (vacio) {
    vacio.textContent = MENSAJE_SIN_SESION;
    vacio.hidden = false;
  }
  syncColeccionNavCount();
}

function activarColeccion() {
  const vacio = qs('#mensaje-vacio');
  if (vacio) vacio.textContent = MENSAJE_SIN_PLANTAS;

  render(root);
  syncColeccionNavCount();

  if (coleccionActiva) return;
  coleccionActiva = true;

  // Escuchar cambios en tiempo real
  const unsubscribe = onColeccionChange(() => {
    render(root).catch(console.error);
  });

  // Limpiar suscripción si el usuario se va de la página
  window.addEventListener('beforeunload', unsubscribe, { once: true });
}

iniciarPagina(async function init() {
  // La página se muestra siempre: sin sesión queda vacía con el botón de
  // "Iniciar sesión" del header/sidebar, en vez de expulsar a index.html.
  qs('#coleccion-contenido').hidden = false;
  montarChrome();
  await authNav.sync();

  if (await getSession()) {
    activarColeccion();
    return;
  }

  mostrarEstadoSinSesion();
});
