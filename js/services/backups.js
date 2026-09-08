import { supabase } from '../config.js';
import { getSession } from './auth.js';
import {
  APP_ID,
  FORMATO,
  debeHacerAutoBackup,
  copiasAPodar,
} from '../utils/backup-snapshot.js';

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
