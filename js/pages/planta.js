import { obtenerPlanta, actualizarPlanta, subirFotoPlanta, obtenerUrlFoto, eliminarPlanta } from '../services/plantas.js';
import { listarConfig, guardarConfig, listarBitacora, registrarCuidado } from '../services/cuidados.js';
import { TIPOS_CUIDADO } from '../utils/recordatorios.js';
import { qs, qsa, showError, clearError, showStatus, clearStatus, escapeHtml } from '../utils/dom.js';
import { requerirSesion, iniciarPagina, mostrarErrorDePagina } from '../utils/guard.js';

const ETIQUETAS_TIPO = {
  regar: 'Regar',
  fertilizar: 'Fertilizar',
  trasplantar: 'Trasplantar',
  podar: 'Podar',
  otro: 'Otro',
};

const plantaId = new URLSearchParams(window.location.search).get('id');

/**
 * `YYYY-MM-DD` según el calendario local. Usar `new Date()` con `valueAsDate`
 * toma los campos UTC del Date, así que después de las ~21:00 en UTC-3 el
 * formulario arrancaba con la fecha de mañana.
 */
function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Convierte el `YYYY-MM-DD` de un `<input type="date">` a un timestamp ISO
 * interpretándolo como medianoche local. `new Date('2026-08-09')` se parsea
 * como medianoche UTC, y como se muestra con `toLocaleDateString`, en husos
 * negativos cada fecha se veía un día antes.
 */
function fechaInputAISO(valor) {
  return new Date(`${valor}T00:00:00`).toISOString();
}

function ponerFechaDeHoy() {
  qs('#fecha-cuidado').value = fechaLocalISO();
}

async function renderFoto(planta) {
  const url = await obtenerUrlFoto(planta.foto_url);
  const container = qs('#foto-container');
  container.innerHTML = url
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(planta.nombre)}" style="width:100%; max-width:320px; aspect-ratio:1/1; object-fit:cover; border:1px solid var(--color-border);" />`
    : '';
}

function rellenarFormPlanta(planta) {
  qs('#nombre').value = planta.nombre ?? '';
  qs('#especie').value = planta.especie ?? '';
  qs('#ubicacion').value = planta.ubicacion ?? '';
  qs('#fecha_adquisicion').value = planta.fecha_adquisicion ?? '';
  qs('#notas').value = planta.notas ?? '';
}

function wireFormPlanta(planta) {
  const form = qs('#form-planta');
  const errorEl = qs('#error-planta');
  const statusEl = qs('#status-planta');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);
    clearStatus(statusEl);

    const cambios = {
      nombre: qs('#nombre').value,
      especie: qs('#especie').value || null,
      ubicacion: qs('#ubicacion').value || null,
      fecha_adquisicion: qs('#fecha_adquisicion').value || null,
      notas: qs('#notas').value || null,
    };
    const archivoFoto = qs('#foto').files[0];

    try {
      let fotoFallo = false;
      if (archivoFoto) {
        try {
          const path = await subirFotoPlanta(planta.user_id, planta.id, archivoFoto);
          cambios.foto_url = path;
        } catch (fotoError) {
          fotoFallo = true;
          showError(errorEl, `Los datos se guardarán, pero la foto no se pudo subir: ${fotoError.message}`);
        }
      }
      const actualizada = await actualizarPlanta(planta.id, cambios);
      await renderFoto(actualizada);
      if (!fotoFallo) showStatus(statusEl, 'Cambios guardados.');
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

function wireEliminarPlanta(plantaId) {
  const errorEl = qs('#error-eliminar');

  qs('#btn-eliminar-planta').addEventListener('click', async () => {
    clearError(errorEl);
    // Confirmación de una acción destructiva, no un mensaje de error.
    if (!window.confirm('¿Eliminar esta planta? Esta acción no se puede deshacer.')) return;

    try {
      await eliminarPlanta(plantaId);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

async function renderConfigCuidados(plantaId) {
  const container = qs('#config-cuidados');
  const configs = await listarConfig(plantaId);
  const porTipo = Object.fromEntries(configs.map((c) => [c.tipo, c.frecuencia_dias]));

  container.innerHTML = TIPOS_CUIDADO.map(
    (tipo) => `
      <div class="field" style="flex-direction: row; align-items: center; gap: var(--space-3);">
        <label style="min-width: 140px;" for="frecuencia-${tipo}">${ETIQUETAS_TIPO[tipo]}</label>
        <input class="input" style="max-width: 100px;" type="number" min="1" id="frecuencia-${tipo}"
          value="${porTipo[tipo] ?? ''}" placeholder="días" />
      </div>
    `
  ).join('');

  const errorEl = qs('#error-config-cuidados');
  qsa('#config-cuidados input').forEach((input) => {
    input.addEventListener('change', async () => {
      const tipo = input.id.replace('frecuencia-', '');
      // Vacío, 0 o negativo significan "no se controla" (coincide con min="1").
      // Guardar 0 producía una planta vencida para siempre.
      const numero = Number.parseInt(input.value, 10);
      const valor = Number.isFinite(numero) && numero >= 1 ? numero : null;
      if (String(valor ?? '') !== input.value) input.value = valor ?? '';

      try {
        await guardarConfig(plantaId, tipo, valor);
        clearError(errorEl);
      } catch (err) {
        showError(errorEl, err.message);
      }
    });
  });
}

function poblarSelectTipos() {
  const select = qs('#tipo-cuidado');
  select.innerHTML = TIPOS_CUIDADO.map((tipo) => `<option value="${tipo}">${ETIQUETAS_TIPO[tipo]}</option>`).join('');
}

function wireFormCuidado(plantaId) {
  const form = qs('#form-cuidado');
  const errorEl = qs('#error-cuidado');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    const tipo = qs('#tipo-cuidado').value;
    const fecha = qs('#fecha-cuidado').value;
    const notas = qs('#notas-cuidado').value || null;

    try {
      await registrarCuidado(plantaId, tipo, fechaInputAISO(fecha), notas);
      form.reset();
      // `reset()` deja la fecha vacía: la volvemos a poner en hoy.
      ponerFechaDeHoy();
      await renderBitacora(plantaId);
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

async function renderBitacora(plantaId) {
  const lista = qs('#lista-bitacora');
  const eventos = await listarBitacora(plantaId);

  lista.innerHTML = eventos
    .map(
      (evento) => `
        <li class="card" style="margin-bottom: var(--space-3);">
          <strong>${ETIQUETAS_TIPO[evento.tipo]}</strong> — ${new Date(evento.fecha).toLocaleDateString('es')}
          ${evento.notas ? `<p style="margin: var(--space-2) 0 0 0;">${escapeHtml(evento.notas)}</p>` : ''}
        </li>
      `
    )
    .join('');
}

iniciarPagina(async function init() {
  const session = await requerirSesion();
  if (!session) return;

  if (!plantaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  // `obtenerPlanta` usa `.single()`, que lanza si la fila no existe o si RLS la
  // oculta (por ejemplo, el id de la planta de otra persona en la URL).
  let planta;
  try {
    planta = await obtenerPlanta(plantaId);
  } catch (err) {
    console.error('No se pudo cargar la planta', err);
    qs('#contenido-planta').hidden = true;
    mostrarErrorDePagina('No encontramos esa planta.', { href: 'dashboard.html', texto: 'Volver a mis plantas' });
    return;
  }

  rellenarFormPlanta(planta);
  await renderFoto(planta);
  wireFormPlanta(planta);
  wireEliminarPlanta(planta.id);

  poblarSelectTipos();
  ponerFechaDeHoy();

  await renderConfigCuidados(plantaId);
  wireFormCuidado(plantaId);
  await renderBitacora(plantaId);
});
