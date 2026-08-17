import { supabase } from '../config.js';

export async function listarCuidadosColeccion(coleccionId) {
  const { data, error } = await supabase
    .from('coleccion_cuidados')
    .select('*')
    .eq('coleccion_id', coleccionId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function registrarCuidadoColeccion(coleccionId, tipo, fecha, notas) {
  const { data, error } = await supabase
    .from('coleccion_cuidados')
    .insert({ coleccion_id: coleccionId, tipo, fecha, notas })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function eliminarCuidadoColeccion(id) {
  const { error } = await supabase.from('coleccion_cuidados').delete().eq('id', id);
  if (error) throw error;
}
