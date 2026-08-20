import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_BORRABLES = [
  "ganancia",
  "perdida",
  "deuda",
];

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Convierte un campo PostgreSQL DATE recibido por Prisma
 * a YYYY-MM-DD.
 *
 * IMPORTANTE:
 * La columna en PostgreSQL es @db.Date.
 * Por eso NO usamos toISOString() ni hora local.
 *
 * Prisma representa el DATE como Date, pero nosotros
 * recuperamos únicamente año, mes y día.
 */
function obtenerSoloFecha(fecha: Date | null) {
  if (!fecha) return null;

  const año = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

/**
 * Obtiene el día actual de Argentina en formato YYYY-MM-DD.
 *
 * Esto NO compara horas.
 * Solamente determina cuál es el día actual en Argentina.
 */
function obtenerFechaHoy() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const año = partes.find(
    (parte) => parte.type === "year"
  )?.value;

  const mes = partes.find(
    (parte) => parte.type === "month"
  )?.value;

  const dia = partes.find(
    (parte) => parte.type === "day"
  )?.value;

  return `${año}-${mes}-${dia}`;
}

/**
 * Compara solamente:
 *
 * YYYY-MM-DD === YYYY-MM-DD
 *
 * No se compara hora, minutos, segundos ni milisegundos.
 */
function esMismoDia(fecha: Date | null) {
  if (!fecha) return false;

  const fechaRegistro = obtenerSoloFecha(fecha);
  const fechaHoy = obtenerFechaHoy();

  return fechaRegistro === fechaHoy;
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id: idParam } = await params;

    const id = parseInt(idParam, 10);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        {
          error: "ID inválido",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Buscamos el registro.
     */
    const fila = await prisma.caja.findUnique({
      where: {
        id,
      },
    });

    if (!fila) {
      return NextResponse.json(
        {
          error: "No se encontró el registro",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Solo permitimos borrar impactos manuales.
     */
    if (!TIPOS_BORRABLES.includes(fila.tipo_impacto)) {
      return NextResponse.json(
        {
          error:
            "Solo se pueden eliminar registros manuales de ganancia, pérdida o deuda.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANTE:
     *
     * fila.fecha es PostgreSQL DATE.
     *
     * La comparación se hace exclusivamente como:
     *
     * YYYY-MM-DD === YYYY-MM-DD
     *
     * No se tiene en cuenta ninguna hora.
     */
    if (!esMismoDia(fila.fecha)) {
      return NextResponse.json(
        {
          error:
            "Este registro ya forma parte del historial de un día anterior y no se puede eliminar.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.$transaction(async (tx) => {
      /*
       * Buscamos la fila inmediatamente anterior.
       *
       * La fila anterior representa el estado de caja
       * antes de aplicar el movimiento que estamos eliminando.
       */
      const filaAnterior = await tx.caja.findFirst({
        where: {
          id: {
            lt: id,
          },
        },
        orderBy: {
          id: "desc",
        },
      });

      /*
       * Calculamos cuánto modificó la fila que vamos a borrar.
       */
      const deltaTotal = round2(
        Number(fila.monto_total) -
          Number(filaAnterior?.monto_total ?? 0)
      );

      const deltaGanancia = round2(
        Number(fila.monto_ganancia) -
          Number(filaAnterior?.monto_ganancia ?? 0)
      );

      const deltaPerdida = round2(
        Number(fila.monto_perdida) -
          Number(filaAnterior?.monto_perdida ?? 0)
      );

      const deltaPendientePago = round2(
        Number(fila.monto_pendiente_pago) -
          Number(filaAnterior?.monto_pendiente_pago ?? 0)
      );

      const deltaDeuda = round2(
        Number(fila.monto_deuda) -
          Number(filaAnterior?.monto_deuda ?? 0)
      );

      const deltaDestinadoDeuda = round2(
        Number(fila.monto_destinado_deuda) -
          Number(filaAnterior?.monto_destinado_deuda ?? 0)
      );

      /*
       * Todas las filas posteriores tienen que retroceder
       * exactamente el mismo delta.
       */
      const filasPosteriores = await tx.caja.findMany({
        where: {
          id: {
            gt: id,
          },
        },
        orderBy: {
          id: "asc",
        },
      });

      for (const posterior of filasPosteriores) {
        await tx.caja.update({
          where: {
            id: posterior.id,
          },
          data: {
            monto_total: round2(
              Number(posterior.monto_total) -
                deltaTotal
            ),

            monto_ganancia: round2(
              Number(posterior.monto_ganancia) -
                deltaGanancia
            ),

            monto_perdida: round2(
              Number(posterior.monto_perdida) -
                deltaPerdida
            ),

            monto_pendiente_pago: round2(
              Number(posterior.monto_pendiente_pago) -
                deltaPendientePago
            ),

            monto_deuda: round2(
              Number(posterior.monto_deuda) -
                deltaDeuda
            ),

            monto_destinado_deuda: round2(
              Number(posterior.monto_destinado_deuda) -
                deltaDestinadoDeuda
            ),
          },
        });
      }

      /*
       * Finalmente eliminamos la fila.
       */
      await tx.caja.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error(
      "Error al eliminar registro de caja:",
      err
    );

    return NextResponse.json(
      {
        error: "Ocurrió un error al eliminar el registro",
      },
      {
        status: 500,
      }
    );
  }
}