import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      fecha_pago,
      descripcion,
      monto,
    } = body;

    if (
      typeof fecha_pago !== "string" ||
      !fechaValida(fecha_pago)
    ) {
      return NextResponse.json(
        { error: "Fecha de pago inválida" },
        { status: 400 }
      );
    }

    if (
      typeof descripcion !== "string" ||
      !descripcion.trim()
    ) {
      return NextResponse.json(
        { error: "La descripción es obligatoria" },
        { status: 400 }
      );
    }

    if (descripcion.trim().length > 500) {
      return NextResponse.json(
        {
          error:
            "La descripción no puede superar los 500 caracteres",
        },
        { status: 400 }
      );
    }

    if (
      typeof monto !== "number" ||
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a cero" },
        { status: 400 }
      );
    }

    const gastoActual =
      await prisma.gastospersonales.findUnique({
        where: { id },
      });

    if (!gastoActual) {
      return NextResponse.json(
        { error: "No se encontró el gasto personal" },
        { status: 404 }
      );
    }

    const gasto =
      await prisma.gastospersonales.update({
        where: { id },
        data: {
          fecha_pago: new Date(`${fecha_pago}T00:00:00`),
          descripcion: descripcion.trim(),
          monto: round2(monto),
        },
      });

    return NextResponse.json({
      ok: true,
      gasto,
    });
  } catch (err) {
    console.error(
      "Error al actualizar gasto personal:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al guardar los cambios",
      },
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
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const gasto =
      await prisma.gastospersonales.findUnique({
        where: { id },
      });

    if (!gasto) {
      return NextResponse.json(
        { error: "No se encontró el gasto personal" },
        { status: 404 }
      );
    }

    await prisma.gastospersonales.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error(
      "Error al eliminar gasto personal:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al eliminar el gasto personal",
      },
      { status: 500 }
    );
  }
}