import { supabase } from '../config.js';

export async function listarPlantas() {
  const { data, error } = await supabase
    .from('plantas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function obtenerPlanta(id) {
  const { data, error } = await supabase.from('plantas').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function crearPlanta(planta) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session.user.id;

  const { data, error } = await supabase
    .from('plantas')
    .insert({ ...planta, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarPlanta(id, cambios) {
  const { data, error } = await supabase
    .from('plantas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Borra la planta y, si existe, su foto en storage. `cuidado_config` y
 * `cuidados` se limpian solos por las FK `on delete cascade`.
 * El borrado del archivo es best-effort: la fila de la base es la fuente de
 * verdad, así que un fallo de storage no aborta la operación.
 */
export async function eliminarPlanta(id) {
  let fotoPath = null;
  try {
    const planta = await obtenerPlanta(id);
    fotoPath = planta.foto_url ?? null;
  } catch (err) {
    console.warn('No se pudo leer la planta antes de borrarla', err);
  }

  if (fotoPath) {
    try {
      const { error: storageError } = await supabase.storage.from('plantas-fotos').remove([fotoPath]);
      if (storageError) console.warn('No se pudo borrar la foto de la planta', storageError);
    } catch (err) {
      console.warn('No se pudo borrar la foto de la planta', err);
    }
  }

  const { error } = await supabase.from('plantas').delete().eq('id', id);
  if (error) throw error;
}

export async function subirFotoPlanta(userId, plantaId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${plantaId}.${ext}`;
  const { error } = await supabase.storage
    .from('plantas-fotos')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function obtenerUrlFoto(fotoPath) {
  if (!fotoPath) return null;
  const { data, error } = await supabase.storage
    .from('plantas-fotos')
    .createSignedUrl(fotoPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
