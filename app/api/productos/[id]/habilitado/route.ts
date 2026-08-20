import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { habilitado } = body;

    if (!["si", "no"].includes(habilitado)) {
      return NextResponse.json({ error: "habilitado inválido" }, { status: 400 });
    }

    const producto = await prisma.productos.findUnique({ where: { id } });
    if (!producto) {
      return NextResponse.json({ error: "No se encontró el producto" }, { status: 404 });
    }

    const actualizado = await prisma.productos.update({
      where: { id },
      data: { habilitado, modified: new Date() },
    });

    return NextResponse.json({ ok: true, producto: actualizado });
  } catch (err) {
    console.error("Error al cambiar habilitado:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al actualizar el producto" },
      { status: 500 }
    );
  }
}