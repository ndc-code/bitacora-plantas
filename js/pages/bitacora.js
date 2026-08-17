import { qs, escapeHtml, showError, clearError } from '../utils/dom.js';
import { getSession } from '../services/auth.js';
import { obtenerItemColeccion } from '../services/coleccion.js';
import {
  listarCuidadosColeccion,
  registrarCuidadoColeccion,
  eliminarCuidadoColeccion,
} from '../services/coleccion-cuidados.js';
import {
  FOTOS_LIMITE,
  listarFotosColeccion,
  subirFotoColeccion,
  eliminarFotoColeccion,
  obtenerUrlFoto,
} from '../services/coleccion-fotos.js';
import { riegosDePlanta } from '../utils/coleccion-card.js';
import { categoriaDe } from '../utils/catalog-categorias.js';
import { estacionActual, riegoParaEstacion } from '../utils/catalog-riego-estacion.js';
import { diasDeRiego, formatFechaCorta } from '../utils/riego-frecuencia.js';
import { syncColeccionNavCount } from '../utils/coleccion-nav.js';
import { wireAuthModal } from '../utils/auth-modal.js';
import { wireAuthNav } from '../utils/auth-nav.js';
import { wireReloj } from '../utils/reloj.js';
import { wireThemeToggle } from '../utils/theme.js';
import { iniciarPagina, mostrarErrorDePagina } from '../utils/guard.js';

const ETIQUETAS_TIPO = {
  regar: 'Regar',
  fertilizar: 'Fertilizar',
  trasplantar: 'Trasplantar',
  podar: 'Podar',
  observacion: 'Observación',
  otro: 'Otro',
};

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const coleccionId = new URLSearchParams(window.location.search).get('id');

let mesCalendario = new Date();
mesCalendario.setDate(1);
let calendarioCtx = null;

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
    planta.suelo ? `suelo ${planta.suelo.toLowerCase()}` : null,
    planta.cuidado ? `cuidado ${planta.cuidado.toLowerCase()}` : null,
  ].filter(Boolean);

  const partes = [];
  if (especie) partes.push(especie);
  if (categoria && categoria !== '—') partes.push(categoria.toLowerCase());
  const bajada = partes.join(' · ');

  const cuerpo = detalles.length
    ? `${bajada}${bajada ? ' — ' : ''}${detalles.join(', ')}.`
    : bajada;

  const enColeccion = planta.created_at
    ? `En colección desde ${formatFechaCorta(planta.created_at)}.`
    : '';

  return [cuerpo, enColeccion].filter(Boolean).join(' ');
}

function filaDetalleMarkup(indice, nombre, valor) {
  return `
    <li class="bitacora-detalle-item">
      <span class="bitacora-detalle-nombre"><span class="bitacora-detalle-idx">${String(indice).padStart(2, '0')}</span>${nombre}</span>
      <span class="bitacora-detalle-valor">${valor}</span>
    </li>
  `;
}

function renderDetalle(planta) {
  qs('#bitacora-detalle').innerHTML = [
    filaDetalleMarkup(1, 'Categoría', escapeHtml(categoriaDe(planta))),
    filaDetalleMarkup(2, 'Especie', escapeHtml(planta.especie || '—')),
    filaDetalleMarkup(3, 'Ubicación', escapeHtml(planta.ubicacion || '—')),
    filaDetalleMarkup(4, 'Luz', escapeHtml(planta.luz || '—')),
    filaDetalleMarkup(5, 'Suelo', escapeHtml(planta.suelo || '—')),
    filaDetalleMarkup(6, 'Cuidado', escapeHtml(planta.cuidado || '—')),
  ].join('');
}

function renderNotas(eventos) {
  const lista = qs('#bitacora-notas');
  if (!eventos.length) {
    lista.innerHTML = '<li class="bitacora-nota-vacio">Todavía no hay anotaciones.</li>';
    return;
  }
  lista.innerHTML = eventos
    .map(
      (evento) => `
        <li class="bitacora-nota-item" data-id="${escapeHtml(evento.id)}">
          <span class="bitacora-nota-fecha">${escapeHtml(formatFechaCorta(evento.fecha))}</span>
          <span class="bitacora-nota-texto">
            ${escapeHtml(ETIQUETAS_TIPO[evento.tipo] || evento.tipo)}
            ${evento.notas ? `— ${escapeHtml(evento.notas)}` : ''}
          </span>
          <button type="button" class="coleccion-eliminar-btn bitacora-nota-eliminar">eliminar</button>
        </li>
      `
    )
    .join('');
}

function mismoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fechasDeRiego(fechaInicio, frecuenciaDias) {
  if (!frecuenciaDias || !fechaInicio) return [];
  const fechas = [];
  let actual = new Date(fechaInicio);
  actual.setHours(0, 0, 0, 0);
  const limite = new Date(actual);
  limite.setFullYear(limite.getFullYear() + 1);
  while (actual <= limite) {
    fechas.push(new Date(actual));
    actual = new Date(actual);
    actual.setDate(actual.getDate() + frecuenciaDias);
  }
  return fechas;
}

function renderCalendario() {
  const cont = qs('#bitacora-calendario');
  if (!cont || !calendarioCtx) return;

  const { planta, eventos } = calendarioCtx;
  const riego = riegoParaEstacion(riegosDePlanta(planta), planta.riego, estacionActual());
  const frecuenciaDias = diasDeRiego(riego);
  const fechasRiego = fechasDeRiego(planta.created_at, frecuenciaDias);

  const anio = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const offset = (primerDia.getDay() + 6) % 7;
  const hoy = new Date();

  const celdas = [];
  for (let i = 0; i < offset; i++) {
    celdas.push('<span class="bitacora-calendario-celda is-vacia"></span>');
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fecha = new Date(anio, mes, dia);
    const clases = ['bitacora-calendario-celda'];
    const eventosDia = eventos.filter((e) => e.tipo === 'regar' && mismoDia(new Date(e.fecha), fecha));
    const esDebida = fechasRiego.some((f) => mismoDia(f, fecha));
    if (eventosDia.length) {
      clases.push('is-regado');
    } else if (esDebida) {
      clases.push('is-riego');
    }
    if (mismoDia(fecha, hoy)) clases.push('is-hoy');
    const interactiva = eventosDia.length > 0 || esDebida;
    const idsRegado = eventosDia.map((e) => e.id).join(',');
    celdas.push(
      `<button type="button" class="${clases.join(' ')}" data-dia="${dia}" data-evento-ids="${idsRegado}" ${interactiva ? '' : 'disabled'}>${dia}</button>`
    );
  }

  cont.innerHTML = `
    <div class="bitacora-calendario-header">
      <button type="button" class="bitacora-calendario-nav" data-mes="-1" aria-label="Mes anterior">‹</button>
      <p class="bitacora-calendario-mes">${MESES_LARGOS[mes]} ${anio}</p>
      <button type="button" class="bitacora-calendario-nav" data-mes="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="bitacora-calendario-dias">
      ${DIAS_SEMANA.map((d) => `<span class="bitacora-calendario-dia-nombre">${d}</span>`).join('')}
    </div>
    <div class="bitacora-calendario-grid">${celdas.join('')}</div>
    ${frecuenciaDias ? '' : '<p class="bitacora-calendario-vacio">Configurá la frecuencia de riego de esta planta para ver las próximas fechas.</p>'}
  `;
}

function actualizarCalendario(planta, eventos) {
  calendarioCtx = { planta, eventos };
  renderCalendario();
}

function wireCalendario(planta) {
  const cont = qs('#bitacora-calendario');
  if (!cont || cont.dataset.wired) return;
  cont.dataset.wired = '1';
  cont.addEventListener('click', async (event) => {
    const navBtn = event.target.closest('.bitacora-calendario-nav');
    if (navBtn) {
      mesCalendario.setMonth(mesCalendario.getMonth() + Number(navBtn.dataset.mes));
      renderCalendario();
      return;
    }

    const celda = event.target.closest('.bitacora-calendario-celda');
    if (!celda || celda.disabled || !celda.dataset.dia) return;

    const idsRegado = celda.dataset.eventoIds ? celda.dataset.eventoIds.split(',') : [];

    celda.disabled = true;
    try {
      if (idsRegado.length) {
        await Promise.all(idsRegado.map((id) => eliminarCuidadoColeccion(id)));
      } else {
        const fecha = new Date(
          mesCalendario.getFullYear(),
          mesCalendario.getMonth(),
          Number(celda.dataset.dia),
          12
        );
        await registrarCuidadoColeccion(planta.id, 'regar', fecha.toISOString(), null);
      }
      await pintarBitacora(planta);
    } catch (err) {
      console.error('No se pudo actualizar el riego', err);
      celda.disabled = false;
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

function wireEliminarNota(planta) {
  const lista = qs('#bitacora-notas');
  if (!lista) return;

  lista.addEventListener('click', async (event) => {
    const btn = event.target.closest('.bitacora-nota-eliminar');
    if (!btn) return;

    const item = btn.closest('.bitacora-nota-item');
    const id = item?.dataset.id;
    if (!id || btn.disabled) return;

    btn.disabled = true;
    try {
      await eliminarCuidadoColeccion(id);
      await pintarBitacora(planta);
    } catch (err) {
      console.error('No se pudo eliminar la nota', err);
      btn.disabled = false;
    }
  });
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
  renderDetalle(planta);
  renderNotas(eventos);
  actualizarCalendario(planta, eventos);
  await renderGaleriaGrid(planta.id);
}

function wireAgregarEntrada() {
  const btn = qs('#bitacora-agregar-btn');
  const form = qs('#form-cuidado');
  if (!btn || !form) return;

  btn.addEventListener('click', () => {
    const abrir = form.hidden;
    form.hidden = !abrir;
    btn.textContent = abrir ? 'Cancelar' : '+ Agregar entrada';
    if (abrir) qs('#tipo-cuidado')?.focus();
  });
}

function wireTipoCuidado() {
  const select = qs('#tipo-cuidado');
  const label = qs('#label-notas-cuidado');
  const input = qs('#notas-cuidado');
  if (!select || !label || !input) return;

  const actualizar = () => {
    const esObservacion = select.value === 'observacion';
    label.textContent = esObservacion ? 'Qué observaste' : 'Notas';
    input.placeholder = esObservacion ? 'Contá qué notaste en la planta' : 'Opcional';
  };

  select.addEventListener('change', actualizar);
  actualizar();
}

function wireFormCuidado(planta) {
  const form = qs('#form-cuidado');
  const errorEl = qs('#error-cuidado');
  const submitBtn = form.querySelector('[type="submit"]');
  const agregarBtn = qs('#bitacora-agregar-btn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn?.disabled) return;
    clearError(errorEl);

    const tipo = qs('#tipo-cuidado').value;
    const notas = qs('#notas-cuidado').value || null;

    if (tipo === 'observacion' && !notas) {
      showError(errorEl, 'Contá qué observaste en la planta.');
      qs('#notas-cuidado').focus();
      return;
    }

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

      await registrarCuidadoColeccion(planta.id, tipo, new Date().toISOString(), notas);
      form.reset();
      qs('#tipo-cuidado').value = 'regar';
      form.hidden = true;
      if (agregarBtn) agregarBtn.textContent = '+ Agregar entrada';
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
  wireAgregarEntrada();
  wireTipoCuidado();
  wireEliminarNota(planta);
  wireSubidaFoto(planta);
  wireEliminarFoto(planta);
  wireCalendario(planta);
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
  wireThemeToggle();
  wireSidebarToggle();
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
