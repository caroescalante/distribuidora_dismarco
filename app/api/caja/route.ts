import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerCajaActual, registrarImpactoCaja } from "@/lib/caja";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Por ahora el ABM manual solo permite estos dos tipos: son los únicos con
// una fórmula confirmada. "inversion" y "deuda" quedan reservados en el enum
// hasta que se defina cómo impactan en la caja.
const TIPOS_MANUALES = ["ganancia", "perdida", "deuda"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo_impacto, monto, nota, dinero_extraido } = body;

    if (!TIPOS_MANUALES.includes(tipo_impacto)) {
      return NextResponse.json(
        {
          error:
            "tipo_impacto inválido. Solo se puede cargar 'ganancia', 'perdida' o 'deuda'.",
        },
        { status: 400 }
      );
    }
    if (typeof monto !== "number" || monto <= 0) {
      return NextResponse.json({ error: "El monto tiene que ser mayor a 0" }, { status: 400 });
    }
    if (nota !== undefined && nota !== null && typeof nota !== "string") {
      return NextResponse.json({ error: "nota inválida" }, { status: 400 });
    }
    if (dinero_extraido !== undefined && !["si", "no"].includes(dinero_extraido)) {
      return NextResponse.json({ error: "dinero_extraido inválido" }, { status: 400 });
    }

    const notaLimpia = typeof nota === "string" && nota.trim() !== "" ? nota.trim() : null;

    // Este campo solo aplica a "deuda": es el único tipo que por diseño no toca
    // monto_total. Para ganancia/pérdida se ignora lo que mande el cliente y
    // queda fijo en "no" (su propia lógica ya define el efecto en monto_total).
    // Default para deuda: "si" (si no mandan nada o mandan "si").
    const dineroExtraidoEfectivo: "si" | "no" =
      tipo_impacto === "deuda" ? (dinero_extraido === "no" ? "no" : "si") : "no";

    const montoRedondeado = round2(monto);

    const resultado = await prisma.$transaction(async (tx) => {
      const cajaActual = await obtenerCajaActual(tx);
      const montoTotalActual = Number(cajaActual?.monto_total ?? 0);

      if (tipo_impacto === "ganancia") {
        const montoGananciaActual = Number(cajaActual?.monto_ganancia ?? 0);

        return registrarImpactoCaja(tx, {
          monto_total: round2(montoTotalActual + montoRedondeado),
          monto_ganancia: round2(montoGananciaActual + montoRedondeado),
          tipo_impacto: "ganancia",
          nota: notaLimpia,
          dinero_extraido: "no",
          monto_movimiento: montoRedondeado,
        });
      }

      if (tipo_impacto === "perdida") {
        const montoPerdidaActual = Number(cajaActual?.monto_perdida ?? 0);

        return registrarImpactoCaja(tx, {
          monto_total: round2(montoTotalActual - montoRedondeado),
          monto_perdida: round2(montoPerdidaActual + montoRedondeado),
          tipo_impacto: "perdida",
          nota: notaLimpia,
          dinero_extraido: "no",
          monto_movimiento: montoRedondeado,
        });
      }

      // deuda: se destina plata a pagar deuda existente.
      const montoDeudaActual = Number(cajaActual?.monto_deuda ?? 0);
      const montoDestinadoDeudaActual = Number(cajaActual?.monto_destinado_deuda ?? 0);

      // Si el dinero salió físicamente de la caja, además se descuenta de monto_total.
      // Si no, todo queda como antes: solo se mueve deuda -> destinado a deuda.
      const nuevoMontoTotal =
        dineroExtraidoEfectivo === "si"
          ? round2(montoTotalActual - montoRedondeado)
          : montoTotalActual;

      return registrarImpactoCaja(tx, {
        monto_total: nuevoMontoTotal,
        monto_deuda: round2(montoDeudaActual - montoRedondeado),
        monto_destinado_deuda: round2(montoDestinadoDeudaActual + montoRedondeado),
        tipo_impacto: "deuda",
        nota: notaLimpia,
        dinero_extraido: dineroExtraidoEfectivo,
        monto_movimiento: montoRedondeado,
      });
      
    });

    return NextResponse.json({ ok: true, caja: resultado }, { status: 201 });
  } catch (err) {
    console.error("Error al registrar impacto manual de caja:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar el registro" },
      { status: 500 }
    );
  }
}