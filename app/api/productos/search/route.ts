import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length === 0) {
    return NextResponse.json({ productos: [] });
  }

  const productos = await prisma.productos.findMany({
    where: {
      descripcion: { contains: q, mode: "insensitive" },
      habilitado: "si",
    },
    select: {
      id: true,
      descripcion: true,
      precio: true,
      stock_disponible: true,
    },
    orderBy: { descripcion: "asc" },
    take: 8,
  });

  return NextResponse.json({
    productos: productos.map((p) => ({
      id: p.id,
      descripcion: p.descripcion,
      precio: Number(p.precio),
      stock_disponible: p.stock_disponible,
    })),
  });
}