import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerCajaActual, registrarImpactoCaja } from "@/lib/caja";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: NextRequest) {
  try {
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

    const monto_pendiente = round2(monto_total - monto_pago);

    // Buscamos el primer movimiento externo cargado hoy para asociar la nota manual.
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(inicioHoy);
    finHoy.setDate(finHoy.getDate() + 1);

    const movimientoDeHoy = await prisma.movimientosexternos.findFirst({
      where: { fecha_movimiento: { gte: inicioHoy, lt: finHoy } },
      orderBy: { id: "asc" },
      select: { id: true, fecha_movimiento: true },
    });

    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoCredito = await tx.creditosclientes.create({
        data: {
          movimiento_externo_id: movimientoDeHoy?.id ?? null,
          nombre_cliente: nombre_cliente.trim(),
          descripcion: descripcion.trim(),
          monto_total: round2(monto_total),
          monto_pago: round2(monto_pago),
          monto_pendiente,
          estado,
          fecha: movimientoDeHoy?.fecha_movimiento ?? new Date(),
        },
      });

      // --- Ajuste de caja ---
      const cajaActual = await obtenerCajaActual(tx);
      const montoTotalCajaActual = Number(cajaActual?.monto_total ?? 0);
      const montoPendientePagoActual = Number(cajaActual?.monto_pendiente_pago ?? 0);

      let nuevoMontoTotalCaja: number;
      let nuevoMontoPendientePago = montoPendientePagoActual;

      if (estado === "pago") {
        // Ya está cobrado: entra directo a la caja, nunca pasó por "pendiente".
        nuevoMontoTotalCaja = round2(montoTotalCajaActual + monto_pendiente);
      } else {
        // no_pago: todavía no entró a la caja, pero queda anotado como pendiente de cobro.
        nuevoMontoTotalCaja = round2(montoTotalCajaActual - monto_pendiente);
        nuevoMontoPendientePago = round2(montoPendientePagoActual + monto_pendiente);
      }

      await registrarImpactoCaja(tx, {
        monto_total: nuevoMontoTotalCaja,
        monto_pendiente_pago: nuevoMontoPendientePago,
        tipo_impacto: "creditos_clientes",
        referencia_id: nuevoCredito.id,
      });

      return nuevoCredito;
    });

    return NextResponse.json({ ok: true, credito: resultado }, { status: 201 });
  } catch (err) {
    console.error("Error al crear nota de crédito manual:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar la nota de crédito" },
      { status: 500 }
    );
  }
}