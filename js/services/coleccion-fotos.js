import { supabase } from '../config.js';
import { getSession } from './auth.js';

export const FOTOS_LIMITE = 12;
const TAMANIO_MAXIMO = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function listarFotosColeccion(coleccionId) {
  const { data, error } = await supabase
    .from('coleccion_fotos')
    .select('*')
    .eq('coleccion_id', coleccionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function subirFotoColeccion(coleccionId, file) {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return { ok: false, reason: 'tipo_invalido' };
  }
  if (file.size > TAMANIO_MAXIMO) {
    return { ok: false, reason: 'muy_pesada' };
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, reason: 'not_authenticated' };
  }

  const actuales = await listarFotosColeccion(coleccionId);
  if (actuales.length >= FOTOS_LIMITE) {
    return { ok: false, reason: 'limite_alcanzado' };
  }

  const ext = file.name.split('.').pop();
  const path = `${session.user.id}/coleccion/${coleccionId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('plantas-fotos').upload(path, file);
  if (uploadError) return { ok: false, reason: 'error', error: uploadError };

  const { data, error } = await supabase
    .from('coleccion_fotos')
    .insert({ coleccion_id: coleccionId, storage_path: path })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('plantas-fotos').remove([path]);
    return { ok: false, reason: 'error', error };
  }

  return { ok: true, foto: data };
}

export async function eliminarFotoColeccion(foto) {
  const { error: deleteRowError } = await supabase
    .from('coleccion_fotos')
    .delete()
    .eq('id', foto.id);
  if (deleteRowError) return { ok: false, reason: 'error', error: deleteRowError };

  const { error: storageError } = await supabase.storage
    .from('plantas-fotos')
    .remove([foto.storage_path]);
  if (storageError) console.warn('No se pudo borrar el archivo de la foto', storageError);

  return { ok: true };
}

export async function obtenerUrlFoto(storagePath) {
  const { data, error } = await supabase.storage
    .from('plantas-fotos')
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
