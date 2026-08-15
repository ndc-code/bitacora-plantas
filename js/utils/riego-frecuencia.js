const DIA_MS = 1000 * 60 * 60 * 24;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaComoLocal(valor) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00`);
  }
  return new Date(valor);
}

function inicioDiaLocal(fecha) {
  const d = fechaComoLocal(fecha);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function diasDeRiego(texto) {
  if (typeof texto !== 'string') return null;
  const match = texto.trim().match(/^Cada (\d+) días$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function textoProximoRiego(proximaFecha, ahora = new Date()) {
  if (proximaFecha == null) return null;
  const dias = Math.round(
    (inicioDiaLocal(proximaFecha).getTime() - inicioDiaLocal(ahora).getTime()) / DIA_MS
  );
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'En 1 día';
  if (dias > 1) return `En ${dias} días`;
  if (dias === -1) return 'Hace 1 día';
  return `Hace ${Math.abs(dias)} días`;
}

export function formatFechaCorta(valor) {
  const d = fechaComoLocal(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
