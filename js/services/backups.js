import { supabase } from '../config.js';
import { getSession } from './auth.js';
import {
  APP_ID,
  FORMATO,
  debeHacerAutoBackup,
  copiasAPodar,
  validarSnapshot,
  nombreArchivoDescarga,
} from '../utils/backup-snapshot.js';
import { limpiarCacheColeccion } from './coleccion.js';

export const TABLA = 'user_backups';
export const BUCKET = 'plantas-fotos';
export const LABEL_AUTO = 'Copia automática';
export const CONSERVAR_AUTO = 7;

export function errorTablaAusente(e) {
  return Boolean(e) && e.code === '42P01';
}

async function requerirUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('No hay una sesión activa.');
  return session.user.id;
}

/**
 * Lee las tres tablas del usuario y arma el snapshot base (sin binarios).
 * `coleccion_cuidados` y `coleccion_fotos` se traen por los `coleccion_id` de
 * la colección del usuario, que es como están scopeadas por RLS.
 */
export async function crearSnapshotActual() {
  const userId = await requerirUserId();

  const { data: coleccion, error: e1 } = await supabase
    .from('user_collection')
    .select('*')
    .eq('user_id', userId);
  if (e1) throw e1;

  const ids = (coleccion || []).map((c) => c.id);
  let cuidados = [];
  let fotos = [];
  if (ids.length) {
    const [rc, rf] = await Promise.all([
      supabase.from('coleccion_cuidados').select('*').in('coleccion_id', ids),
      supabase.from('coleccion_fotos').select('*').in('coleccion_id', ids),
    ]);
    if (rc.error) throw rc.error;
    if (rf.error) throw rf.error;
    cuidados = rc.data || [];
    fotos = rf.data || [];
  }

  return {
    app: APP_ID,
    format: FORMATO,
    user_id: userId,
    created_at: new Date().toISOString(),
    data: {
      user_collection: coleccion || [],
      coleccion_cuidados: cuidados,
      coleccion_fotos: fotos,
    },
  };
}

function backupPathDe(userId, backupId, foto) {
  // storage_path vivo: {uid}/coleccion/{coleccion_id}/{archivo}
  // copia:            {uid}/backups/{backupId}/{coleccion_id}/{archivo}
  const cola = String(foto.storage_path).split('/').slice(2).join('/');
  return `${userId}/backups/${backupId}/${cola}`;
}

/**
 * Crea una copia en la nube: inserta la fila, copia cada binario de foto dentro
 * de Storage y guarda el `backup_path` de cada foto en el snapshot.
 */
export async function crearCopia(label = null) {
  const userId = await requerirUserId();
  const snapshot = await crearSnapshotActual();
  const fotos = snapshot.data.coleccion_fotos;

  const { data: fila, error } = await supabase
    .from(TABLA)
    .insert({ user_id: userId, label, snapshot, photo_count: fotos.length })
    .select('id,created_at,label')
    .single();
  if (error) throw error;

  if (fotos.length) {
    for (const foto of fotos) {
      const destino = backupPathDe(userId, fila.id, foto);
      const { error: eCopy } = await supabase.storage.from(BUCKET).copy(foto.storage_path, destino);
      if (eCopy) {
        console.warn('No se pudo copiar el binario de una foto a la copia', eCopy);
        continue;
      }
      foto.backup_path = destino;
    }
    const { error: eUpd } = await supabase.from(TABLA).update({ snapshot }).eq('id', fila.id);
    if (eUpd) throw eUpd;
  }

  return fila;
}

export async function listarCopias() {
  const userId = await requerirUserId();
  const { data, error } = await supabase
    .from(TABLA)
    .select('id,label,photo_count,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function borrarCopia(id) {
  const userId = await requerirUserId();

  const { data: fila, error: eSel } = await supabase
    .from(TABLA)
    .select('snapshot')
    .eq('id', id)
    .single();
  if (eSel) throw eSel;

  const paths = (fila?.snapshot?.data?.coleccion_fotos || [])
    .map((f) => f.backup_path)
    .filter(Boolean);
  if (paths.length) {
    const { error: eRm } = await supabase.storage.from(BUCKET).remove(paths);
    if (eRm) console.warn('No se pudieron borrar todos los binarios de la copia', eRm);
  }

  const { error } = await supabase.from(TABLA).delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Poda las copias automáticas más viejas hasta dejar CONSERVAR_AUTO.
 * Best-effort: cualquier error se traga.
 */
async function podarAutomaticas() {
  try {
    const userId = await requerirUserId();
    const { data, error } = await supabase
      .from(TABLA)
      .select('id,created_at')
      .eq('user_id', userId)
      .eq('label', LABEL_AUTO)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    const sobran = copiasAPodar(data, CONSERVAR_AUTO);
    for (const fila of sobran) {
      try { await borrarCopia(fila.id); } catch (e) { /* best-effort */ }
    }
  } catch (e) { /* best-effort */ }
}

function claveUltimoAuto(userId) {
  return `ultima_copia_auto_${userId}`;
}

/**
 * Una copia automática por día y por usuario, silenciosa. Si la tabla no existe
 * o no hay conexión, no molesta y reintenta al día siguiente.
 */
export async function autoBackupSiCorresponde() {
  let userId;
  try { userId = await requerirUserId(); } catch (e) { return; }

  const hoy = new Date().toISOString().slice(0, 10);
  let marca = null;
  try { marca = localStorage.getItem(claveUltimoAuto(userId)); } catch (e) { /* modo privado */ }
  if (!debeHacerAutoBackup(marca, hoy)) return;

  try {
    // ¿ya hay una copia de hoy (de este u otro dispositivo)?
    const { data } = await supabase
      .from(TABLA)
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${hoy}T00:00:00Z`)
      .limit(1);
    if (!data || !data.length) {
      await crearCopia(LABEL_AUTO);
      await podarAutomaticas();
    }
    try { localStorage.setItem(claveUltimoAuto(userId), hoy); } catch (e) { /* modo privado */ }
  } catch (e) {
    // tabla ausente / offline: mañana se reintenta
  }
}

async function blobABase64(blob) {
  const buf = await blob.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ABlob(b64, tipo = 'application/octet-stream') {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Borra todas las filas vivas del usuario y sus binarios de foto. */
async function borrarTodoLoVivo(userId) {
  const { data: coleccion, error: eSel } = await supabase
    .from('user_collection')
    .select('id')
    .eq('user_id', userId);
  if (eSel) throw eSel;
  const ids = (coleccion || []).map((c) => c.id);

  if (ids.length) {
    const { data: fotos } = await supabase
      .from('coleccion_fotos')
      .select('storage_path')
      .in('coleccion_id', ids);

    const { error: eC } = await supabase.from('coleccion_cuidados').delete().in('coleccion_id', ids);
    if (eC) throw eC;
    const { error: eF } = await supabase.from('coleccion_fotos').delete().in('coleccion_id', ids);
    if (eF) throw eF;

    const paths = (fotos || []).map((f) => f.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: eRm } = await supabase.storage.from(BUCKET).remove(paths);
      if (eRm) console.warn('No se pudieron borrar todos los binarios vivos', eRm);
    }
  }

  const { error: eU } = await supabase.from('user_collection').delete().eq('user_id', userId);
  if (eU) throw eU;
}

/**
 * Reemplazo total. Antes de tocar nada crea una copia de seguridad del estado
 * actual. No es atómico (varias tablas desde el navegador): la copia previa es
 * la red si se corta a la mitad.
 * Devuelve `{ fotosFallidas }` para que la página avise.
 */
export async function restaurarDesdeSnapshot(snapshot, { fuente }) {
  const userId = await requerirUserId();
  const { data } = snapshot;

  // 1. Copia previa (no bloquea si falla; la página ya avisó y confirmó).
  try {
    const cuando = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    await crearCopia(`Antes de restaurar (${cuando})`);
  } catch (e) {
    console.warn('No se pudo crear la copia previa a restaurar', e);
  }

  // 2. Borrar lo vivo.
  await borrarTodoLoVivo(userId);

  // 3. Reinsertar filas (mismos id). user_collection primero por las FK.
  if (data.user_collection.length) {
    const filas = data.user_collection.map((c) => ({ ...c, user_id: userId }));
    const { error } = await supabase.from('user_collection').insert(filas);
    if (error) throw error;
  }
  if (data.coleccion_cuidados.length) {
    const { error } = await supabase.from('coleccion_cuidados').insert(data.coleccion_cuidados);
    if (error) throw error;
  }
  if (data.coleccion_fotos.length) {
    const filas = data.coleccion_fotos.map(({ backup_path, bytes_base64, bytes_mime, ...fila }) => fila);
    const { error } = await supabase.from('coleccion_fotos').insert(filas);
    if (error) throw error;
  }

  // 4. Reponer binarios de foto.
  let fotosFallidas = 0;
  for (const foto of data.coleccion_fotos) {
    try {
      if (fuente === 'nube') {
        if (!foto.backup_path) { fotosFallidas += 1; continue; }
        const { error } = await supabase.storage.from(BUCKET).copy(foto.backup_path, foto.storage_path);
        if (error) { fotosFallidas += 1; }
      } else {
        if (!foto.bytes_base64) { fotosFallidas += 1; continue; }
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(foto.storage_path, base64ABlob(foto.bytes_base64, foto.bytes_mime), { upsert: true });
        if (error) { fotosFallidas += 1; }
      }
    } catch (e) {
      fotosFallidas += 1;
    }
  }

  // 5. Limpiar caché local de colección.
  try { limpiarCacheColeccion(); } catch (e) { /* nada que hacer */ }

  return { fotosFallidas };
}

export async function restaurarCopia(id) {
  const { data: fila, error } = await supabase
    .from(TABLA)
    .select('snapshot')
    .eq('id', id)
    .single();
  if (error) throw error;
  const v = validarSnapshot(fila?.snapshot);
  if (!v.ok) throw new Error(v.motivo);
  // validarSnapshot no copia backup_path; traerlo del snapshot crudo.
  v.snapshot.data.coleccion_fotos = fila.snapshot?.data?.coleccion_fotos || [];
  return restaurarDesdeSnapshot(v.snapshot, { fuente: 'nube' });
}

/**
 * Arma un `.json` autónomo: snapshot + cada foto en base64, y dispara la
 * descarga con un `<a download>` temporal.
 */
export async function descargarArchivo() {
  const snapshot = await crearSnapshotActual();
  for (const foto of snapshot.data.coleccion_fotos) {
    try {
      const { data: blob, error } = await supabase.storage.from(BUCKET).download(foto.storage_path);
      if (error || !blob) { continue; }
      foto.bytes_base64 = await blobABase64(blob);
      foto.bytes_mime = blob.type || 'application/octet-stream';
    } catch (e) {
      console.warn('No se pudo incrustar una foto en el .json', e);
    }
  }

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoDescarga(snapshot.created_at);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee y valida un `.json` de copia. Lanza `Error` legible si es inválido. */
export function leerArchivoDeCopia(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        reject(new Error('El archivo no es un JSON válido.'));
        return;
      }
      const v = validarSnapshot(parsed);
      if (!v.ok) { reject(new Error(v.motivo)); return; }
      // conservar bytes_base64 que validarSnapshot no copia
      const bruto = parsed.data ?? parsed;
      v.snapshot.data.coleccion_fotos = Array.isArray(bruto.coleccion_fotos) ? bruto.coleccion_fotos : [];
      resolve(v.snapshot);
    };
    reader.readAsText(file);
  });
}
