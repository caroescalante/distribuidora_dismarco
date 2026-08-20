import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const productoActual = await prisma.productos.findUnique({ where: { id } });
    if (!productoActual) {
      return NextResponse.json({ error: "No se encontró el producto" }, { status: 404 });
    }

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
      (!Number.isInteger(stock_disponible) || stock_disponible < 0)
    ) {
      return NextResponse.json({ error: "stock_disponible inválido" }, { status: 400 });
    }
    if (
      precio_costo !== null &&
      precio_costo !== undefined &&
      (typeof precio_costo !== "number" || precio_costo < 0)
    ) {
      return NextResponse.json({ error: "precio_costo inválido" }, { status: 400 });
    }
    if (!["si", "no"].includes(habilitado)) {
      return NextResponse.json({ error: "habilitado inválido" }, { status: 400 });
    }

    const actualizado = await prisma.productos.update({
      where: { id },
      data: {
        descripcion: descripcion.trim(),
        precio: round2(precio),
        nota: nota?.trim() ? nota.trim() : null,
        stock_disponible: stock_disponible ?? 0,
        proveedor: proveedor?.trim() ? proveedor.trim() : null,
        precio_costo:
          precio_costo !== null && precio_costo !== undefined ? round2(precio_costo) : null,
        habilitado: habilitado as "si" | "no",
        modified: new Date(),
      },
    });

    return NextResponse.json({ ok: true, producto: actualizado });
  } catch (err) {
    console.error("Error al actualizar producto:", err);
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

    const producto = await prisma.productos.findUnique({ where: { id } });
    if (!producto) {
      return NextResponse.json({ error: "No se encontró el producto" }, { status: 404 });
    }

    // La relación con las líneas de movimientos ya tiene onDelete: SetNull,
    // así que borrar el producto no rompe el historial (cada línea guarda su
    // propio snapshot del nombre y precio). El aviso de "mejor deshabilitalo"
    // se le muestra al usuario antes de llegar acá, desde el frontend.
    await prisma.productos.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al eliminar el producto" },
      { status: 500 }
    );
  }
}