import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerCajaActual, registrarImpactoCaja } from "@/lib/caja";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function esNumeroValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

const CAMPOS_NUMERICOS = [
  "monto_total",
  "monto_ganancia",
  "monto_perdida",
  "monto_deuda",
  "monto_inversion",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      monto_total,
      monto_ganancia,
      monto_perdida,
      monto_deuda,
      monto_inversion,
      nota,
    } = body;

    const valores: Record<string, unknown> = {
      monto_total,
      monto_ganancia,
      monto_perdida,
      monto_deuda,
      monto_inversion,
    };

    for (const campo of CAMPOS_NUMERICOS) {
      if (!esNumeroValido(valores[campo])) {
        return NextResponse.json(
          { error: `El campo ${campo} tiene que ser un número válido` },
          { status: 400 }
        );
      }
    }

    if (nota !== undefined && nota !== null && typeof nota !== "string") {
      return NextResponse.json({ error: "nota inválida" }, { status: 400 });
    }

    const notaLimpia =
      typeof nota === "string" && nota.trim() !== "" ? nota.trim() : null;

    const nuevoMontoTotal = round2(monto_total);

    // Transacción única: 1 lectura + 1 insert. Esto es lo que mantiene
    // el guardado por debajo de los 2 segundos, igual que en /api/caja.
    const resultado = await prisma.$transaction(async (tx) => {
      const cajaActual = await obtenerCajaActual(tx);
      const montoTotalActual = Number(cajaActual?.monto_total ?? 0);

      return registrarImpactoCaja(tx, {
        monto_total: nuevoMontoTotal,
        monto_ganancia: round2(monto_ganancia),
        monto_perdida: round2(monto_perdida),
        monto_deuda: round2(monto_deuda),
        monto_inversion: round2(monto_inversion),
        tipo_impacto: "correccion",
        nota: notaLimpia,
        dinero_extraido: "no",
        monto_movimiento: round2(nuevoMontoTotal - montoTotalActual),
      });
    });

    return NextResponse.json({ ok: true, caja: resultado }, { status: 201 });
  } catch (err) {
    console.error("Error al registrar corrección de caja:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar la corrección" },
      { status: 500 }
    );
  }
}