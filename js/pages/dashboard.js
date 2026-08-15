import { signOut } from '../services/auth.js';
import { listarPlantas, crearPlanta, subirFotoPlanta, actualizarPlanta, obtenerUrlFoto } from '../services/plantas.js';
import { calcularEstadosDePlantas } from '../services/cuidados.js';
import { qs, showError, clearError, escapeHtml } from '../utils/dom.js';
import { requerirSesion, iniciarPagina } from '../utils/guard.js';

const ETIQUETAS_ESTADO = {
  vencido: { texto: 'Vencido', clase: 'badge-vencido' },
  proximo: { texto: 'Próximo', clase: 'badge-proximo' },
  al_dia: { texto: 'Al día', clase: 'badge-neutral' },
  sin_registrar: { texto: 'Sin registrar', clase: 'badge-neutral' },
};

const ETIQUETA_DESCONOCIDA = { texto: 'Sin datos', clase: 'badge-neutral' };

async function renderPlantas() {
  const grid = qs('#grid-plantas');
  const mensajeVacio = qs('#mensaje-vacio');
  grid.innerHTML = '';

  const plantas = await listarPlantas();
  if (plantas.length === 0) {
    mensajeVacio.hidden = false;
    return;
  }
  mensajeVacio.hidden = true;

  // Un solo lote de consultas para todos los estados. Si falla, seguimos
  // dibujando la grilla con badges neutros en vez de dejarla vacía.
  let estados = new Map();
  try {
    estados = await calcularEstadosDePlantas(plantas);
  } catch (err) {
    console.error('No se pudieron calcular los estados de las plantas', err);
  }

  // Una foto rota no puede tumbar el resto de la grilla.
  const fotos = await Promise.all(
    plantas.map(async (planta) => {
      try {
        return await obtenerUrlFoto(planta.foto_url);
      } catch (err) {
        console.error(`No se pudo obtener la foto de la planta ${planta.id}`, err);
        return null;
      }
    })
  );

  plantas.forEach((planta, i) => {
    const fotoUrl = fotos[i];
    const etiqueta = ETIQUETAS_ESTADO[estados.get(planta.id)] ?? ETIQUETA_DESCONOCIDA;
    const nombre = escapeHtml(planta.nombre);

    const card = document.createElement('a');
    card.href = `planta.html?id=${encodeURIComponent(planta.id)}`;
    card.className = 'planta-card';
    card.innerHTML = `
      ${fotoUrl ? `<img src="${escapeHtml(fotoUrl)}" alt="${nombre}" />` : `<div class="placeholder-foto"></div>`}
      <h3>${nombre}</h3>
      <p>${escapeHtml(planta.especie)}</p>
      <p class="${etiqueta.clase}">${etiqueta.texto}</p>
    `;
    grid.appendChild(card);
  });
}

function wireLogout() {
  qs('#btn-logout').addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });
}

function wireNuevaPlanta() {
  const dialog = qs('#dialog-nueva-planta');
  const form = qs('#form-nueva-planta');
  const errorEl = qs('#error-nueva-planta');

  // Si `crearPlanta` funcionó pero la foto falló, dejamos el diálogo abierto
  // para reintentar. Guardamos el id creado para que ese reintento suba la foto
  // en vez de insertar una segunda planta.
  let pendiente = null;

  function resetDialogo() {
    form.reset();
    clearError(errorEl);
    pendiente = null;
  }

  qs('#btn-nueva-planta').addEventListener('click', () => dialog.showModal());
  qs('#btn-cancelar-planta').addEventListener('click', () => dialog.close());
  // Cubre tanto el botón Cancelar como cerrar con Escape.
  dialog.addEventListener('close', resetDialogo);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    const datos = {
      nombre: qs('#nombre').value,
      especie: qs('#especie').value || null,
      ubicacion: qs('#ubicacion').value || null,
      fecha_adquisicion: qs('#fecha_adquisicion').value || null,
    };
    const archivoFoto = qs('#foto').files[0];

    try {
      if (!pendiente) {
        const planta = await crearPlanta(datos);
        pendiente = { id: planta.id, userId: planta.user_id };
      }

      let advertenciaFoto = null;
      if (archivoFoto) {
        try {
          const path = await subirFotoPlanta(pendiente.userId, pendiente.id, archivoFoto);
          await actualizarPlanta(pendiente.id, { foto_url: path });
        } catch (fotoError) {
          advertenciaFoto = `Planta guardada, pero la foto no se pudo subir: ${fotoError.message}`;
        }
      }

      await renderPlantas();

      if (advertenciaFoto) {
        // Dejamos el diálogo abierto para que el usuario vea la advertencia.
        showError(errorEl, advertenciaFoto);
      } else {
        dialog.close();
      }
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

iniciarPagina(async function init() {
  const session = await requerirSesion();
  if (!session) return;

  wireLogout();
  wireNuevaPlanta();
  await renderPlantas();
});
