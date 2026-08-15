export const TIPOS_CUIDADO = ['regar', 'fertilizar', 'trasplantar', 'podar', 'otro'];

const DIA_MS = 1000 * 60 * 60 * 24;
const UMBRAL_PROXIMO_DIAS = 2;

export function calcularProximoVencimiento({ ultimaFecha, fechaAlta, frecuenciaDias }) {
  if (frecuenciaDias == null) return null;
  const base = new Date(ultimaFecha ?? fechaAlta);
  return new Date(base.getTime() + frecuenciaDias * DIA_MS);
}

export function calcularEstadoPlanta(vencimientos, ahora = new Date()) {
  const fechas = vencimientos.filter((v) => v != null);
  if (fechas.length === 0) return 'sin_registrar';

  const masUrgente = fechas.reduce((a, b) => (a < b ? a : b));
  const diffDias = (masUrgente.getTime() - ahora.getTime()) / DIA_MS;

  if (diffDias < 0) return 'vencido';
  if (diffDias <= UMBRAL_PROXIMO_DIAS) return 'proximo';
  return 'al_dia';
}
