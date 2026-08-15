import { qs, escapeHtml, showError, clearError } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { obtenerItemColeccion } from '../services/coleccion.js';
import {
  listarCuidadosColeccion,
  registrarCuidadoColeccion,
} from '../services/coleccion-cuidados.js';
import { riegosDePlanta } from '../utils/coleccion-card.js';
import { estacionActual, riegoParaEstacion } from '../utils/catalog-riego-estacion.js';
import { calcularProximoVencimiento } from '../utils/recordatorios.js';
import { diasDeRiego, textoProximoRiego, formatFechaCorta } from '../utils/riego-frecuencia.js';
import { syncColeccionNavCount } from '../utils/coleccion-nav.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { iniciarPagina, mostrarErrorDePagina } from '../utils/guard.js';

const ETIQUETAS_TIPO = {
  regar: 'Regar',
  fertilizar: 'Fertilizar',
  trasplantar: 'Trasplantar',
  podar: 'Podar',
  otro: 'Otro',
};

const coleccionId = new URLSearchParams(window.location.search).get('id');

function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaInputAISO(valor) {
  return new Date(`${valor}T00:00:00`).toISOString();
}

function ponerFechaDeHoy() {
  qs('#fecha-cuidado').value = fechaLocalISO();
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
  qs('#catalog-sidebar-close')?.addEventListener('click', closeSidebar);
  document.body.addEventListener('click', (event) => {
    const sidebar = qs('#catalog-sidebar');
    if (
      sidebar &&
      sidebar.classList.contains('is-open') &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeSidebar();
    }
  });
}

function ultimoRiegoDe(eventos) {
  return eventos.find((evento) => evento.tipo === 'regar') ?? null;
}

function renderFoto(planta) {
  const imagen = planta.imagen || (Array.isArray(planta.galeria) ? planta.galeria[0] : '');
  qs('#bitacora-foto').innerHTML = imagen
    ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(planta.nombre)}" width="96" height="96" />`
    : '';
}

function renderEstado(planta, eventos) {
  const riego = riegoParaEstacion(riegosDePlanta(planta), planta.riego, estacionActual());
  const frecuenciaDias = diasDeRiego(riego);
  const ultimo = ultimoRiegoDe(eventos);
  const proxima = calcularProximoVencimiento({
    ultimaFecha: ultimo?.fecha ?? null,
    fechaAlta: planta.created_at,
    frecuenciaDias,
  });
  const textoProximo = frecuenciaDias == null ? null : textoProximoRiego(proxima);

  qs('#bitacora-estado').innerHTML = `
    <li><span>En colección</span><span>${escapeHtml(formatFechaCorta(planta.created_at))}</span></li>
    <li><span>Último riego</span><span>${ultimo ? escapeHtml(formatFechaCorta(ultimo.fecha)) : 'Sin registrar'}</span></li>
    <li><span>Próximo riego</span><span>${escapeHtml(textoProximo ?? '—')}</span></li>
  `;
}

function renderHistorial(eventos) {
  const lista = qs('#lista-bitacora');
  if (!eventos.length) {
    lista.innerHTML = '<li>Todavía no hay registros.</li>';
    return;
  }
  lista.innerHTML = eventos
    .map(
      (evento) => `
        <li>
          <strong>${escapeHtml(ETIQUETAS_TIPO[evento.tipo] || evento.tipo)}</strong>
          — ${escapeHtml(formatFechaCorta(evento.fecha))}
          ${evento.notas ? `<p>${escapeHtml(evento.notas)}</p>` : ''}
        </li>
      `
    )
    .join('');
}

function mostrarSolo(idVisible) {
  qs('#mensaje-sesion').hidden = idVisible !== 'mensaje-sesion';
  qs('#mensaje-faltante').hidden = idVisible !== 'mensaje-faltante';
  qs('#bitacora-contenido').hidden = idVisible !== 'bitacora-contenido';
  const errorEl = qs('#error-pagina');
  if (errorEl) errorEl.hidden = idVisible !== 'error-pagina';
}

async function pintarBitacora(planta) {
  const eventos = await listarCuidadosColeccion(planta.id);
  renderFoto(planta);
  qs('#bitacora-nombre').textContent = planta.nombre || '';
  document.title = `${planta.nombre || 'Bitácora'} — Bitácora de Plantas`;
  renderEstado(planta, eventos);
  renderHistorial(eventos);
}

function wireFormCuidado(planta) {
  const form = qs('#form-cuidado');
  const errorEl = qs('#error-cuidado');
  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn?.disabled) return;
    clearError(errorEl);

    const textoOriginal = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando…';
    }

    try {
      if (!(await getSession())) {
        showError(errorEl, 'Iniciá sesión para registrar un cuidado.');
        authNav.sync();
        authModal.open({
          onSuccess: async () => {
            await authNav.sync();
            clearError(errorEl);
          },
        });
        return;
      }

      const tipo = qs('#tipo-cuidado').value;
      const fecha = qs('#fecha-cuidado').value;
      const notas = qs('#notas-cuidado').value || null;

      await registrarCuidadoColeccion(planta.id, tipo, fechaInputAISO(fecha), notas);
      form.reset();
      qs('#tipo-cuidado').value = 'regar';
      ponerFechaDeHoy();
      await pintarBitacora(planta);
    } catch (err) {
      showError(errorEl, err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginal;
      }
    }
  });
}

async function cargarPlanta() {
  if (!coleccionId) {
    mostrarSolo('mensaje-faltante');
    return null;
  }

  let planta;
  try {
    planta = await obtenerItemColeccion(coleccionId);
  } catch (err) {
    console.error('No se pudo cargar la planta', err);
    mostrarSolo('error-pagina');
    mostrarErrorDePagina('No pudimos cargar esta planta. Probá otra vez.');
    return null;
  }

  if (!planta) {
    mostrarSolo('mensaje-faltante');
    return null;
  }

  try {
    await pintarBitacora(planta);
  } catch (err) {
    console.error('No se pudo cargar la bitácora', err);
    mostrarSolo('error-pagina');
    mostrarErrorDePagina('No pudimos cargar esta planta. Probá otra vez.');
    return null;
  }

  mostrarSolo('bitacora-contenido');
  return planta;
}

const authModal = wireAuthModal();
const authNav = wireAuthNav({
  onLogin: () => {
    authModal.open({
      onSuccess: async () => {
        await authNav.sync();
        await syncColeccionNavCount();
        const planta = await cargarPlanta();
        if (planta && !qs('#form-cuidado').dataset.wired) {
          qs('#form-cuidado').dataset.wired = '1';
          wireFormCuidado(planta);
          ponerFechaDeHoy();
        }
      },
    });
  },
});

iniciarPagina(async function init() {
  wireReloj();
  wireSidebarToggle();
  await authNav.sync();
  await syncColeccionNavCount();

  if (!(await getSession())) {
    mostrarSolo('mensaje-sesion');
    return;
  }

  const planta = await cargarPlanta();
  if (!planta) return;
  wireFormCuidado(planta);
  ponerFechaDeHoy();
});
