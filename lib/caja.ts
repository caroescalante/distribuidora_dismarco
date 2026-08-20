import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type TipoImpactoCaja =
  | "ganancia"
  | "perdida"
  | "inversion"
  | "deuda"
  | "movimiento_externo"
  | "creditos_clientes";

/**
 * Trae el último registro de caja (por id descendente).
 * Como cada impacto genera una fila nueva, "el último" es el estado vigente.
 */
export async function obtenerCajaActual(tx: TxClient) {
  return tx.caja.findFirst({ orderBy: { id: "desc" } });
}

/**
 * Registra un impacto sobre la caja como una FILA NUEVA (no pisa la anterior),
 * para que la tabla funcione como historial.
 *
 * Los campos que no se pasan explícitamente se arrastran del último registro
 * (o 0 si todavía no existe ninguno). tipo_impacto default: "movimiento_externo".
 *
 * referencia_id: id del movimiento externo o de la nota de crédito que originó
 * este impacto (para poder redirigir desde la grilla de caja a ese registro).
 * Se deja null para impactos manuales (ganancia/pérdida/inversión/deuda).
 */
export async function registrarImpactoCaja(
  tx: TxClient,
  cambios: {
    monto_total?: number;
    monto_pendiente_pago?: number;
    monto_ganancia?: number;
    monto_perdida?: number;
    monto_deuda?: number;
    monto_inversion?: number;
    monto_movimiento?: number;
    tipo_impacto?: TipoImpactoCaja;
    referencia_id?: number | null;
    nota?: string | null;
    dinero_extraido?: "si" | "no";
    fecha?: Date | null;
  }
) {
  const cajaActual = await obtenerCajaActual(tx);

  return tx.caja.create({
    data: {
      monto_total: cambios.monto_total ?? Number(cajaActual?.monto_total ?? 0),
      monto_pendiente_pago:
        cambios.monto_pendiente_pago ?? Number(cajaActual?.monto_pendiente_pago ?? 0),
      monto_ganancia: cambios.monto_ganancia ?? Number(cajaActual?.monto_ganancia ?? 0),
      monto_perdida: cambios.monto_perdida ?? Number(cajaActual?.monto_perdida ?? 0),
      monto_deuda: cambios.monto_deuda ?? Number(cajaActual?.monto_deuda ?? 0),
      monto_destinado_deuda: Number(cajaActual?.monto_destinado_deuda ?? 0),
      monto_inversion: cambios.monto_inversion ?? Number(cajaActual?.monto_inversion ?? 0),
      tipo_impacto: cambios.tipo_impacto ?? "movimiento_externo",
      referencia_id: cambios.referencia_id ?? null,
      // La nota es propia de cada impacto puntual, no se arrastra de la fila anterior.
      nota: cambios.nota ?? null,
      dinero_extraido: cambios.dinero_extraido ?? "no",
      fecha: cambios.fecha ?? cajaActual?.fecha ?? new Date(),
      monto_movimiento: cambios.monto_movimiento ?? 0,
    },
  });
}