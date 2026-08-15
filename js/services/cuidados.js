import { supabase } from '../config.js';
import { calcularProximoVencimiento, calcularEstadoPlanta } from '../utils/recordatorios.js';

export async function listarConfig(plantaId) {
  const { data, error } = await supabase
    .from('cuidado_config')
    .select('*')
    .eq('planta_id', plantaId);
  if (error) throw error;
  return data;
}

export async function guardarConfig(plantaId, tipo, frecuenciaDias) {
  const { data, error } = await supabase
    .from('cuidado_config')
    .upsert({ planta_id: plantaId, tipo, frecuencia_dias: frecuenciaDias }, { onConflict: 'planta_id,tipo' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarBitacora(plantaId) {
  const { data, error } = await supabase
    .from('cuidados')
    .select('*')
    .eq('planta_id', plantaId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function registrarCuidado(plantaId, tipo, fecha, notas) {
  const { data, error } = await supabase
    .from('cuidados')
    .insert({ planta_id: plantaId, tipo, fecha, notas })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function calcularEstadoDePlanta(planta) {
  const configs = await listarConfig(planta.id);
  const vencimientos = [];

  for (const cfg of configs) {
    if (cfg.frecuencia_dias == null) continue;

    const { data: ultimos, error } = await supabase
      .from('cuidados')
      .select('fecha')
      .eq('planta_id', planta.id)
      .eq('tipo', cfg.tipo)
      .order('fecha', { ascending: false })
      .limit(1);
    if (error) throw error;

    const ultimaFecha = ultimos[0]?.fecha ?? null;
    vencimientos.push(
      calcularProximoVencimiento({
        ultimaFecha,
        fechaAlta: planta.fecha_adquisicion ?? planta.created_at,
        frecuenciaDias: cfg.frecuencia_dias,
      })
    );
  }

  return calcularEstadoPlanta(vencimientos);
}

/**
 * Versión en lote de `calcularEstadoDePlanta`: resuelve el estado de todas las
 * plantas con dos consultas en total (en vez de 5N+N secuenciales) y agrupa en
 * memoria. Devuelve un `Map` de `planta_id` → estado.
 */
export async function calcularEstadosDePlantas(plantas) {
  const estados = new Map();
  if (!plantas || plantas.length === 0) return estados;

  const ids = plantas.map((planta) => planta.id);

  const { data: configs, error: errorConfigs } = await supabase
    .from('cuidado_config')
    .select('planta_id, tipo, frecuencia_dias')
    .in('planta_id', ids);
  if (errorConfigs) throw errorConfigs;

  const { data: cuidados, error: errorCuidados } = await supabase
    .from('cuidados')
    .select('planta_id, tipo, fecha')
    .in('planta_id', ids)
    .order('fecha', { ascending: false });
  if (errorCuidados) throw errorCuidados;

  const configsPorPlanta = new Map();
  for (const cfg of configs) {
    const lista = configsPorPlanta.get(cfg.planta_id);
    if (lista) lista.push(cfg);
    else configsPorPlanta.set(cfg.planta_id, [cfg]);
  }

  // La consulta ya viene ordenada por fecha descendente, así que el primer
  // registro de cada (planta, tipo) es el más reciente.
  const ultimaFechaPorTipo = new Map();
  for (const cuidado of cuidados) {
    const clave = `${cuidado.planta_id}|${cuidado.tipo}`;
    if (!ultimaFechaPorTipo.has(clave)) ultimaFechaPorTipo.set(clave, cuidado.fecha);
  }

  for (const planta of plantas) {
    const vencimientos = [];
    for (const cfg of configsPorPlanta.get(planta.id) ?? []) {
      if (cfg.frecuencia_dias == null) continue;

      const ultimaFecha = ultimaFechaPorTipo.get(`${planta.id}|${cfg.tipo}`) ?? null;
      vencimientos.push(
        calcularProximoVencimiento({
          ultimaFecha,
          fechaAlta: planta.fecha_adquisicion ?? planta.created_at,
          frecuenciaDias: cfg.frecuencia_dias,
        })
      );
    }
    estados.set(planta.id, calcularEstadoPlanta(vencimientos));
  }

  return estados;
}
