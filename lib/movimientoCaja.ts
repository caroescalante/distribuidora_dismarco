/**
 * Calcula cómo un movimiento externo impacta en la caja, dado su tipo,
 * monto, medio de pago y la ganancia/pérdida que haya generado.
 *
 * Se usa tanto para APLICAR un movimiento nuevo como para REVERTIR uno
 * existente (pasándole los valores guardados y restando el resultado).
 */
export function calcularContribucionMovimiento(
  tipo: "ingreso" | "egreso",
  montoTotal: number,
  medioDePago: string,
  gananciaGenerada: number,
  perdidaGenerada: number,
  montoMovimiento: number
) {
  if (tipo === "egreso") {
    // Un egreso (venta de mercadería) siempre suma a la caja.
    //
    // Además, TODO movimiento externo, tanto ingreso como egreso,
    // registra su monto_total en Caja.monto_movimiento.
    return {
      deltaMontoTotal: montoTotal,
      deltaMontoDeuda: 0,
      deltaMontoInversion: 0,
      deltaMontoGanancia: 0,
      deltaMontoPerdida: 0,
      deltaMontoMovimiento: montoMovimiento,
    };
  }

  // Ingreso (compra de mercadería):
  // - Con tarjeta: no toca la caja todavía, queda como deuda.
  // - Con cualquier otro medio: sale de la caja al momento.
  //
  // monto_movimiento se registra igualmente en Caja para dejar
  // contabilizado el monto del movimiento externo.
  const esTarjeta = medioDePago === "tarjeta";

  return {
    deltaMontoTotal: esTarjeta ? 0 : -montoTotal,
    deltaMontoDeuda: esTarjeta ? montoTotal : 0,
    deltaMontoInversion: montoTotal,
    deltaMontoGanancia: gananciaGenerada,
    deltaMontoPerdida: perdidaGenerada,
    deltaMontoMovimiento: montoMovimiento,
  };
}