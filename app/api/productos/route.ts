import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Redondea al medio más cercano (0, 0.5, 1, 1.5, 2, ...)
function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

// true solo si n es un múltiplo exacto de 0.5 (1, 1.5, 2, 2.5, etc)
function esMultiploDeMedio(n: number) {
  return Number.isFinite(n) && Math.abs(Math.round(n * 2) - n * 2) < 1e-9;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { descripcion, precio, nota, stock_disponible, proveedor, precio_costo, habilitado } =
      body;

    if (!descripcion?.trim()) {
      return NextResponse.json({ error: "Falta la descripción" }, { status: 400 });
    }
    if (typeof precio !== "number" || precio < 0) {
      return NextResponse.json({ error: "precio inválido" }, { status: 400 });
    }
    if (
      stock_disponible !== null &&
      stock_disponible !== undefined &&
      (typeof stock_disponible !== "number" ||
        stock_disponible < 0 ||
        !esMultiploDeMedio(stock_disponible))
    ) {
      return NextResponse.json(
        { error: "stock_disponible inválido (debe ser un múltiplo de 0.5)" },
        { status: 400 }
      );
    }
    if (
      precio_costo !== null &&
      precio_costo !== undefined &&
      (typeof precio_costo !== "number" || precio_costo < 0)
    ) {
      return NextResponse.json({ error: "precio_costo inválido" }, { status: 400 });
    }
    if (habilitado !== undefined && !["si", "no"].includes(habilitado)) {
      return NextResponse.json({ error: "habilitado inválido" }, { status: 400 });
    }

    const nuevoProducto = await prisma.productos.create({
      data: {
        descripcion: descripcion.trim(),
        precio: round2(precio),
        nota: nota?.trim() ? nota.trim() : null,
        stock_disponible:
          stock_disponible !== null && stock_disponible !== undefined
            ? roundToHalf(stock_disponible)
            : 0,
        proveedor: proveedor?.trim() ? proveedor.trim() : null,
        precio_costo:
          precio_costo !== null && precio_costo !== undefined ? round2(precio_costo) : null,
        habilitado: (habilitado as "si" | "no") ?? "si",
      },
    });

    return NextResponse.json({ ok: true, producto: nuevoProducto }, { status: 201 });
  } catch (err) {
    console.error("Error al crear producto:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar el producto" },
      { status: 500 }
    );
  }
}