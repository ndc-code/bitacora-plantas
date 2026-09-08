export const APP_ID = 'bitacora-plantas';
export const FORMATO = 1;

const CLAVES_DATA = ['user_collection', 'coleccion_cuidados', 'coleccion_fotos'];

function normalizarData(data) {
  const out = {};
  for (const k of CLAVES_DATA) out[k] = Array.isArray(data?.[k]) ? data[k] : [];
  return out;
}

/**
 * Valida un objeto candidato a snapshot (de la nube o de un archivo `.json`).
 * Acepta tanto el objeto con envoltorio (`{ app, format, data }`) como un
 * objeto que ya sea el `data` (`{ user_collection, ... }`), para tolerar
 * archivos viejos o editados a mano.
 */
export function validarSnapshot(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, motivo: 'La copia está vacía o no es un objeto.' };
  }

  const pareceEnvoltorio = 'app' in obj || 'format' in obj || 'data' in obj;
  if (pareceEnvoltorio) {
    if (obj.app !== APP_ID) return { ok: false, motivo: 'El archivo no es una copia de Bitácora de Plantas.' };
    if (obj.format !== FORMATO) return { ok: false, motivo: `Formato de copia desconocido (${obj.format}).` };
    const data = obj.data;
    if (!data || typeof data !== 'object' || !CLAVES_DATA.some((k) => Array.isArray(data[k]))) {
      return { ok: false, motivo: 'La copia no tiene datos reconocibles.' };
    }
    return {
      ok: true,
      snapshot: {
        app: APP_ID,
        format: FORMATO,
        user_id: obj.user_id ?? null,
        created_at: obj.created_at ?? null,
        data: normalizarData(data),
      },
    };
  }

  if (!CLAVES_DATA.some((k) => Array.isArray(obj[k]))) {
    return { ok: false, motivo: 'La copia no tiene datos reconocibles.' };
  }
  return {
    ok: true,
    snapshot: { app: APP_ID, format: FORMATO, user_id: null, created_at: null, data: normalizarData(obj) },
  };
}

/** `true` si nunca se hizo una copia automática o la última fue antes de hoy. */
export function debeHacerAutoBackup(ultimaFechaISO, hoyISO) {
  if (!ultimaFechaISO) return true;
  return String(ultimaFechaISO).slice(0, 10) < hoyISO;
}

/**
 * De una lista de copias automáticas ordenada por `created_at` desc, devuelve
 * las que sobran después de conservar las `conservar` más nuevas.
 */
export function copiasAPodar(filas, conservar) {
  if (!Array.isArray(filas) || filas.length <= conservar) return [];
  return filas.slice(conservar);
}

export function nombreArchivoDescarga(fechaISO) {
  return `bitacora-plantas-${String(fechaISO).slice(0, 10)}.json`;
}
