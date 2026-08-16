import { qs, qsa, escapeHtml, showError, clearError } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { obtenerItemColeccion, quitarDeColeccion } from '../services/coleccion.js';
import {
  listarCuidadosColeccion,
  registrarCuidadoColeccion,
} from '../services/coleccion-cuidados.js';
import {
  FOTOS_LIMITE,
  listarFotosColeccion,
  subirFotoColeccion,
  eliminarFotoColeccion,
  obtenerUrlFoto,
} from '../services/coleccion-fotos.js';
import { riegosDePlanta, idDeColeccion } from '../utils/coleccion-card.js';
import { categoriaDe } from '../utils/catalog-categorias.js';
import {
  estacionActual,
  riegoParaEstacion,
  wireRiegoEstacion,
} from '../utils/catalog-riego-estacion.js';
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
    ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(planta.nombre)}" />`
    : '';
}

async function renderGaleriaGrid(coleccionId) {
  const grid = qs('#bitacora-galeria-grid');
  const fotos = await listarFotosColeccion(coleccionId);

  if (!fotos.length) {
    grid.innerHTML = '<p class="bitacora-galeria-vacio">Todavía no subiste fotos de esta planta.</p>';
    return;
  }

  const urls = await Promise.all(
    fotos.map((foto) => obtenerUrlFoto(foto.storage_path).catch(() => null))
  );

  grid.innerHTML = fotos
    .map((foto, i) => {
      const url = urls[i];
      if (!url) return '';
      return `
        <figure class="bitacora-galeria-item" data-id="${escapeHtml(foto.id)}" data-path="${escapeHtml(foto.storage_path)}">
          <img src="${escapeHtml(url)}" alt="" loading="lazy" />
          <figcaption>${escapeHtml(formatFechaCorta(foto.created_at))}</figcaption>
          <button type="button" class="bitacora-galeria-eliminar" aria-label="Eliminar foto">×</button>
        </figure>
      `;
    })
    .join('');
}

function descripcionDe(planta) {
  const especie = planta.especie || '';
  const categoria = categoriaDe(planta);
  const detalles = [
    planta.ubicacion ? `prefiere ${planta.ubicacion.toLowerCase()}` : null,
    planta.luz ? `luz ${planta.luz.toLowerCase()}` : null,
  ].filter(Boolean);

  const partes = [];
  if (especie) partes.push(especie);
  if (categoria && categoria !== '—') partes.push(categoria.toLowerCase());
  const bajada = partes.join(' · ');

  if (!detalles.length) return bajada;
  return `${bajada}${bajada ? ' — ' : ''}${detalles.join(', ')}.`;
}

function filaMarkup(nombre, valor) {
  return `
    <li class="riegos-row">
      <span class="riegos-row-nombre">${nombre}</span>
      <span class="riegos-row-linea" aria-hidden="true"></span>
      <span class="riegos-row-valor">${valor}</span>
    </li>
  `;
}

function renderDetalle(planta) {
  const estacion = estacionActual();
  const riego = riegoParaEstacion(riegosDePlanta(planta), planta.riego, estacion);
  const riegoLabel = `
    <button type="button" class="coleccion-riego-btn" data-estacion="${escapeHtml(estacion)}" aria-label="Riego en ${escapeHtml(estacion)}. Clic para cambiar estación">
      Riego <span class="coleccion-card-estacion">(${escapeHtml(estacion)})</span>
    </button>
  `;

  qs('#bitacora-detalle').innerHTML = [
    filaMarkup('Categoría', escapeHtml(categoriaDe(planta))),
    filaMarkup('Especie', escapeHtml(planta.especie || '—')),
    filaMarkup('Ubicación', escapeHtml(planta.ubicacion || '—')),
    filaMarkup('Luz', escapeHtml(planta.luz || '—')),
    filaMarkup(riegoLabel, `<span class="catalog-riego">${escapeHtml(riego)}</span>`),
    filaMarkup('Suelo', escapeHtml(planta.suelo || '—')),
    filaMarkup('Cuidado', escapeHtml(planta.cuidado || '—')),
  ].join('');
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

  qs('#bitacora-estado').innerHTML = [
    filaMarkup('En colección', escapeHtml(formatFechaCorta(planta.created_at))),
    filaMarkup(
      'Último riego',
      ultimo ? escapeHtml(formatFechaCorta(ultimo.fecha)) : 'Sin registrar'
    ),
    filaMarkup('Próximo riego', escapeHtml(textoProximo ?? '—')),
  ].join('');
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

function wireEliminar(planta) {
  const btn = qs('#bitacora-eliminar-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Eliminando…';

    try {
      const result = await quitarDeColeccion(idDeColeccion(planta));

      if (result.ok || result.reason === 'missing') {
        await syncColeccionNavCount();
        window.location.href = 'coleccion.html';
        return;
      }

      btn.disabled = false;
      btn.textContent = textoOriginal;
      mostrarErrorDePagina(
        result.reason === 'not_authenticated'
          ? 'Iniciá sesión de nuevo para editar tu colección.'
          : 'No pudimos eliminar la planta de tu colección. Probá otra vez.'
      );
    } catch (err) {
      console.error('Error eliminando de la colección', err);
      btn.disabled = false;
      btn.textContent = textoOriginal;
      mostrarErrorDePagina('No pudimos eliminar la planta de tu colección. Probá otra vez.');
    }
  });
}

const MENSAJES_ERROR_FOTO = {
  tipo_invalido: 'Ese archivo no es una imagen válida (jpg, png, webp o gif).',
  muy_pesada: 'La imagen pesa más de 5MB. Probá con una más liviana.',
  limite_alcanzado: `Ya llegaste al máximo de ${FOTOS_LIMITE} fotos para esta planta.`,
  not_authenticated: 'Iniciá sesión de nuevo para subir fotos.',
  error: 'No pudimos subir la foto. Probá otra vez.',
};

function wireSubidaFoto(planta) {
  const input = qs('#input-foto-galeria');
  const errorEl = qs('#error-galeria');
  if (!input) return;

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    clearError(errorEl);

    try {
      const result = await subirFotoColeccion(planta.id, file);
      if (!result.ok) {
        showError(errorEl, MENSAJES_ERROR_FOTO[result.reason] ?? MENSAJES_ERROR_FOTO.error);
        return;
      }
      await renderGaleriaGrid(planta.id);
    } catch (err) {
      console.error('Error subiendo foto', err);
      showError(errorEl, MENSAJES_ERROR_FOTO.error);
    } finally {
      input.value = '';
    }
  });
}

function wireEliminarFoto(planta) {
  const grid = qs('#bitacora-galeria-grid');
  if (!grid) return;

  grid.addEventListener('click', async (event) => {
    const btn = event.target.closest('.bitacora-galeria-eliminar');
    if (!btn) return;

    const item = btn.closest('.bitacora-galeria-item');
    const id = item?.dataset.id;
    if (!id || btn.disabled) return;

    btn.disabled = true;
    try {
      const result = await eliminarFotoColeccion({ id, storage_path: item.dataset.path });
      if (!result.ok) {
        console.error('No se pudo eliminar la foto', result.error);
        btn.disabled = false;
        return;
      }
      await renderGaleriaGrid(planta.id);
    } catch (err) {
      console.error('Error eliminando foto', err);
      btn.disabled = false;
    }
  });
}

function wireTabs() {
  const tabs = qsa('.bitacora-tab');
  const secciones = tabs
    .map((tab) => document.querySelector(tab.getAttribute('href')))
    .filter(Boolean);

  if (!tabs.length || !secciones.length) return;

  const marcarActivo = (id) => {
    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) marcarActivo(visible.target.id);
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );

  secciones.forEach((seccion) => observer.observe(seccion));
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
  qs('#bitacora-especie').textContent = descripcionDe(planta);
  document.title = `${planta.nombre || 'Bitácora'} — Bitácora de Plantas`;
  renderEstado(planta, eventos);
  renderDetalle(planta);
  renderHistorial(eventos);
  await renderGaleriaGrid(planta.id);
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

function wireDetallePlanta(planta) {
  if (!planta || qs('#form-cuidado').dataset.wired) return;
  qs('#form-cuidado').dataset.wired = '1';

  wireFormCuidado(planta);
  wireEliminar(planta);
  wireSubidaFoto(planta);
  wireEliminarFoto(planta);
  wireRiegoEstacion(qs('#bitacora-detalle'));
  ponerFechaDeHoy();
}

const authModal = wireAuthModal();
const authNav = wireAuthNav({
  onLogin: () => {
    authModal.open({
      onSuccess: async () => {
        await authNav.sync();
        await syncColeccionNavCount();
        const planta = await cargarPlanta();
        wireDetallePlanta(planta);
      },
    });
  },
});

iniciarPagina(async function init() {
  wireReloj();
  wireSidebarToggle();
  wireTabs();
  await authNav.sync();
  await syncColeccionNavCount();

  if (!(await getSession())) {
    mostrarSolo('mensaje-sesion');
    return;
  }

  const planta = await cargarPlanta();
  if (!planta) return;
  wireDetallePlanta(planta);
});
