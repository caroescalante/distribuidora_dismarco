import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerCajaActual, registrarImpactoCaja } from "@/lib/caja";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { nombre_cliente, descripcion, monto_total, monto_pago, estado } = body;

    if (!nombre_cliente?.trim() || !descripcion?.trim()) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }
    if (typeof monto_total !== "number" || monto_total < 0) {
      return NextResponse.json({ error: "monto_total inválido" }, { status: 400 });
    }
    if (typeof monto_pago !== "number" || monto_pago < 0) {
      return NextResponse.json({ error: "monto_pago inválido" }, { status: 400 });
    }
    if (!["no_pago", "pago"].includes(estado)) {
      return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    }

    const creditoActual = await prisma.creditosclientes.findUnique({ where: { id } });
    if (!creditoActual) {
      return NextResponse.json({ error: "No se encontró la nota de crédito" }, { status: 404 });
    }

    const estadoAnterior = creditoActual.estado;
    const pendienteAnterior = Number(creditoActual.monto_pendiente ?? 0);
    const pendienteNuevo = round2(monto_total - monto_pago);

    const resultado = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.creditosclientes.update({
        where: { id },
        data: {
          nombre_cliente: nombre_cliente.trim(),
          descripcion: descripcion.trim(),
          monto_total: round2(monto_total),
          monto_pago: round2(monto_pago),
          monto_pendiente: pendienteNuevo,
          estado,
        },
      });

      // --- Ajuste de caja según cómo cambió el estado y/o los montos ---
      const cajaActual = await obtenerCajaActual(tx);
      const montoTotalCajaActual = Number(cajaActual?.monto_total ?? 0);
      const montoPendientePagoActual = Number(cajaActual?.monto_pendiente_pago ?? 0);

      let nuevoMontoTotalCaja = montoTotalCajaActual;
      let nuevoMontoPendientePago = montoPendientePagoActual;
      let hayCambiosEnCaja = false;

      if (estadoAnterior === "no_pago" && estado === "no_pago") {
        // Sigue pendiente, pero el monto pudo haber cambiado al editar: ajustamos por la diferencia.
        const delta = round2(pendienteNuevo - pendienteAnterior);
        if (delta !== 0) {
          nuevoMontoTotalCaja = round2(montoTotalCajaActual - delta);
          nuevoMontoPendientePago = round2(montoPendientePagoActual + delta);
          hayCambiosEnCaja = true;
        }
      } else if (estadoAnterior === "no_pago" && estado === "pago") {
        // Deja de estar pendiente: se cobra y sale de "pendiente de pago".
        nuevoMontoTotalCaja = round2(montoTotalCajaActual + pendienteNuevo);
        nuevoMontoPendientePago = round2(montoPendientePagoActual - pendienteAnterior);
        hayCambiosEnCaja = true;
      } else if (estadoAnterior === "pago" && estado === "no_pago") {
        // Se revierte: esa plata sale de la caja de nuevo y vuelve a quedar pendiente de cobro.
        nuevoMontoTotalCaja = round2(montoTotalCajaActual - pendienteAnterior);
        nuevoMontoPendientePago = round2(montoPendientePagoActual + pendienteNuevo);
        hayCambiosEnCaja = true;
      }
      // Nota: si estadoAnterior === estado === "pago", no se dispara ningún ajuste automático de caja.

      if (hayCambiosEnCaja) {
        await registrarImpactoCaja(tx, {
          monto_total: nuevoMontoTotalCaja,
          monto_pendiente_pago: nuevoMontoPendientePago,
          tipo_impacto: "creditos_clientes",
          referencia_id: id,
        });
      }

      return actualizado;
    });

    return NextResponse.json({ ok: true, credito: resultado });
  } catch (err) {
    console.error("Error al actualizar nota de crédito:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar los cambios" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const creditoActual = await prisma.creditosclientes.findUnique({ where: { id } });
    if (!creditoActual) {
      return NextResponse.json({ error: "No se encontró la nota de crédito" }, { status: 404 });
    }

    const pendiente = Number(creditoActual.monto_pendiente ?? 0);

    await prisma.$transaction(async (tx) => {
      await tx.creditosclientes.delete({ where: { id } });

      // Solo ajustamos la caja si la nota todavía estaba pendiente de cobro.
      // Si ya estaba "pago", esa plata ya quedó reflejada en la caja y no se toca.
      if (creditoActual.estado === "no_pago" && pendiente !== 0) {
        const cajaActual = await obtenerCajaActual(tx);
        const montoTotalCajaActual = Number(cajaActual?.monto_total ?? 0);
        const montoPendientePagoActual = Number(cajaActual?.monto_pendiente_pago ?? 0);

        const nuevoMontoTotalCaja = round2(montoTotalCajaActual + pendiente);
        const nuevoMontoPendientePago = round2(montoPendientePagoActual - pendiente);

        await registrarImpactoCaja(tx, {
          monto_total: nuevoMontoTotalCaja,
          monto_pendiente_pago: nuevoMontoPendientePago,
          tipo_impacto: "creditos_clientes",
          referencia_id: id,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al eliminar nota de crédito:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al eliminar la nota de crédito" },
      { status: 500 }
    );
  }
}