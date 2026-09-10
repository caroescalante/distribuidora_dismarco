import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { obtenerCajaActual, registrarImpactoCaja } from "@/lib/caja";
import { calcularContribucionMovimiento } from "@/lib/movimientoCaja";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

type ProductoLinea = {
  producto_id: number;
  nombre: string;
  cantidad: number;
};

type CreditoLinea = {
  nombre_cliente: string;
  descripcion: string;
  monto_total: number;
  monto_pago: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const tipo_movimiento = formData.get("tipo_movimiento") as string | null;
    const pago = formData.get("pago") as string | null;
    const medio_de_pago = formData.get("medio_de_pago") as string | null;
    const nota = formData.get("nota") as string | null;
    const file = formData.get("comprobante") as File | null;
    const productosRaw = formData.get("productos") as string | null;

    // Solo aplican a egreso:
    const factura =
      (formData.get("factura") as string | null) ?? "no";
    const entregado =
      (formData.get("entregado") as string | null) ?? "no";
    const creditosRaw = formData.get("creditos") as string | null;

    // Solo aplica a ingreso:
    // lo que realmente se pagó por el pedido.
    const montoTotalPagadoRaw =
      formData.get("monto_total_pagado") as string | null;

    if (!tipo_movimiento || !pago || !medio_de_pago || !productosRaw) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (!["ingreso", "egreso"].includes(tipo_movimiento)) {
      return NextResponse.json(
        { error: "tipo_movimiento inválido" },
        { status: 400 }
      );
    }

    if (
      !["efectivo", "transferencia", "tarjeta", "varios"].includes(
        medio_de_pago
      )
    ) {
      return NextResponse.json(
        { error: "medio_de_pago inválido" },
        { status: 400 }
      );
    }

    if (!["si", "no"].includes(pago)) {
      return NextResponse.json(
        { error: "pago inválido" },
        { status: 400 }
      );
    }

    if (
      !["si", "no"].includes(factura) ||
      !["si", "no"].includes(entregado)
    ) {
      return NextResponse.json(
        { error: "factura/entregado inválido" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // PRODUCTOS
    // ---------------------------------------------------------

    let productos: ProductoLinea[];

    try {
      productos = JSON.parse(productosRaw);
    } catch {
      return NextResponse.json(
        { error: "Formato de productos inválido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: "Agregá al menos un producto al movimiento" },
        { status: 400 }
      );
    }

    const productoIds = [
      ...new Set(productos.map((p) => p.producto_id)),
    ];

    const productosDb = await prisma.productos.findMany({
      where: {
        id: {
          in: productoIds,
        },
      },
      select: {
        id: true,
        precio: true,
      },
    });

    const precioPorId = new Map(
      productosDb.map((p) => [p.id, Number(p.precio)])
    );

    for (const p of productos) {
      if (!precioPorId.has(p.producto_id)) {
        return NextResponse.json(
          {
            error: `El producto "${p.nombre}" ya no existe`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(p.cantidad) ||
        p.cantidad <= 0
      ) {
        return NextResponse.json(
          {
            error: `Cantidad inválida para "${p.nombre}"`,
          },
          { status: 400 }
        );
      }
    }

    const cantidad_total = productos.reduce(
      (acc, p) => acc + p.cantidad,
      0
    );

    const normalTotal = round2(
      productos.reduce(
        (acc, p) =>
          acc +
          precioPorId.get(p.producto_id)! * p.cantidad,
        0
      )
    );

    // ---------------------------------------------------------
    // MONTO DEL MOVIMIENTO
    // ---------------------------------------------------------

    let monto_total: number;
    let ganancia = 0;
    let perdida = 0;
    let factor = 1;

    if (tipo_movimiento === "ingreso") {
      if (!montoTotalPagadoRaw) {
        return NextResponse.json(
          { error: "Falta el monto total pagado" },
          { status: 400 }
        );
      }

      monto_total = Number(montoTotalPagadoRaw);

      if (
        Number.isNaN(monto_total) ||
        monto_total <= 0
      ) {
        return NextResponse.json(
          { error: "monto_total_pagado inválido" },
          { status: 400 }
        );
      }

      factor =
        normalTotal > 0
          ? monto_total / normalTotal
          : 1;

      const diferencia = round2(
        normalTotal - monto_total
      );

      if (diferencia > 0) {
        ganancia = diferencia;
      } else if (diferencia < 0) {
        perdida = round2(-diferencia);
      }
    } else {
      // Egreso:
      // se sigue calculando como siempre,
      // en base al precio de catálogo.
      monto_total = normalTotal;
    }

    // Este es el valor que se va a guardar tanto en
    // MovimientosExternos.monto_total como en
    // Caja.monto_movimiento.
    const montoMovimiento = round2(monto_total);

    // ---------------------------------------------------------
    // DESCRIPCIÓN
    // ---------------------------------------------------------

    const descripcion = productos
      .map((p) => {
        const precio =
          precioPorId.get(p.producto_id)!;

        return `${p.cantidad} x ${p.nombre} ($${precio.toFixed(
          2
        )} c/u)`;
      })
      .join("\n");

    // ---------------------------------------------------------
    // CRÉDITOS
    // ---------------------------------------------------------

    let creditos: CreditoLinea[] = [];

    if (
      tipo_movimiento === "egreso" &&
      creditosRaw
    ) {
      try {
        creditos = JSON.parse(creditosRaw);
      } catch {
        return NextResponse.json(
          { error: "Formato de créditos inválido" },
          { status: 400 }
        );
      }
    }

    for (const c of creditos) {
      if (!c.nombre_cliente?.trim()) {
        return NextResponse.json(
          {
            error:
              "Falta el nombre de un cliente en notas de crédito",
          },
          { status: 400 }
        );
      }

      if (!c.descripcion?.trim()) {
        return NextResponse.json(
          {
            error: `Falta la descripción del crédito de ${c.nombre_cliente}`,
          },
          { status: 400 }
        );
      }

      if (
        typeof c.monto_total !== "number" ||
        c.monto_total < 0
      ) {
        return NextResponse.json(
          {
            error: `Monto total inválido para ${c.nombre_cliente}`,
          },
          { status: 400 }
        );
      }

      if (
        typeof c.monto_pago !== "number" ||
        c.monto_pago < 0
      ) {
        return NextResponse.json(
          {
            error: `Monto de pago inválido para ${c.nombre_cliente}`,
          },
          { status: 400 }
        );
      }
    }

    // ---------------------------------------------------------
    // COMPROBANTE
    // ---------------------------------------------------------

    let nro_comprobante: string | null = null;

    if (file && file.size > 0) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              "Formato de comprobante no soportado. Usá PDF, JPG o PNG.",
          },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            error:
              "El comprobante no puede superar los 10MB",
          },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "comprobantes"
      );

      await mkdir(uploadsDir, {
        recursive: true,
      });

      const ext =
        file.name.split(".").pop() ?? "bin";

      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      await writeFile(
        path.join(uploadsDir, filename),
        buffer
      );

      nro_comprobante =
        `/uploads/comprobantes/${filename}`;
    }

    // ---------------------------------------------------------
    // TRANSACCIÓN COMPLETA
    // ---------------------------------------------------------

    const movimiento = await prisma.$transaction(
      async (tx) => {
        // -----------------------------------------------------
        // MOVIMIENTO EXTERNO
        // -----------------------------------------------------

        const nuevoMovimiento =
          await tx.movimientosexternos.create({
            data: {
              tipo_movimiento:
                tipo_movimiento as
                  | "ingreso"
                  | "egreso",

              descripcion,

              // Este es el monto real del movimiento.
              monto_total,

              cantidad_total,

              pago: pago as "si" | "no",

              medio_de_pago:
                medio_de_pago as
                  | "efectivo"
                  | "transferencia"
                  | "tarjeta"
                  | "varios",

              factura:
                tipo_movimiento === "egreso"
                  ? (factura as "si" | "no")
                  : "no",

              entregado:
                tipo_movimiento === "egreso"
                  ? (entregado as "si" | "no")
                  : "no",

              estado:
                tipo_movimiento === "ingreso"
                  ? "retirado"
                  : null,

              nota:
                nota && nota.trim() !== ""
                  ? nota
                  : null,

              nro_comprobante,

              monto_ganancia_generada:
                ganancia,

              monto_perdida_generada:
                perdida,
            },
          });

        // -----------------------------------------------------
        // LÍNEAS DE PRODUCTO
        // -----------------------------------------------------

        await tx.movimientosexternosproductos.createMany(
          {
            data: productos.map((p) => {
              const precioCatalogo =
                precioPorId.get(p.producto_id)!;

              const precioUnitario =
                tipo_movimiento === "ingreso"
                  ? round2(
                      precioCatalogo * factor
                    )
                  : precioCatalogo;

              return {
                movimiento_externo_id:
                  nuevoMovimiento.id,

                producto_id:
                  p.producto_id,

                nombre_producto:
                  p.nombre,

                cantidad:
                  p.cantidad,

                precio_unitario:
                  precioUnitario,
              };
            }),
          }
        );

        // -----------------------------------------------------
        // STOCK
        // -----------------------------------------------------
        // Nota: precio_costo ya NO se calcula ni se actualiza
        // acá. Es un campo que ahora carga el usuario
        // manualmente en la ficha del producto.

        if (tipo_movimiento === "ingreso") {
          for (const p of productos) {
            await tx.productos.update({
              where: {
                id: p.producto_id,
              },
              data: {
                stock_disponible: {
                  increment: p.cantidad,
                },
              },
            });
          }
        } else {
          for (const p of productos) {
            await tx.productos.update({
              where: {
                id: p.producto_id,
              },
              data: {
                stock_disponible: {
                  decrement: p.cantidad,
                },
              },
            });
          }
        }

        // -----------------------------------------------------
        // CRÉDITOS
        // -----------------------------------------------------

        let sumaMontoPendienteCreditos = 0;

        if (creditos.length > 0) {
          sumaMontoPendienteCreditos =
            round2(
              creditos.reduce(
                (acc, c) =>
                  acc +
                  (c.monto_total -
                    c.monto_pago),
                0
              )
            );

          await tx.creditosclientes.createMany({
            data: creditos.map((c) => ({
              movimiento_externo_id:
                nuevoMovimiento.id,

              nombre_cliente:
                c.nombre_cliente.trim(),

              descripcion:
                c.descripcion.trim(),

              monto_total:
                round2(c.monto_total),

              monto_pago:
                round2(c.monto_pago),

              monto_pendiente:
                round2(
                  c.monto_total -
                    c.monto_pago
                ),

              estado: "no_pago",

              fecha:
                nuevoMovimiento.fecha_movimiento,
            })),
          });
        }

        // -----------------------------------------------------
        // CAJA
        // -----------------------------------------------------

        const cajaActual =
          await obtenerCajaActual(tx);

        /*
         * IMPORTANTE:
         *
         * montoMovimiento es exactamente el mismo
         * MovimientosExternos.monto_total que acabamos
         * de guardar.
         *
         * Se registra en Caja.monto_movimiento tanto
         * para INGRESO como para EGRESO.
         */
        const contribucion =
          calcularContribucionMovimiento(
            tipo_movimiento as
              | "ingreso"
              | "egreso",

            monto_total,

            medio_de_pago,

            ganancia,

            perdida,

            montoMovimiento
          );

        // -----------------------------------------------------
        // Monto total de caja
        // -----------------------------------------------------

        const nuevoMontoTotalCaja =
          round2(
            Number(
              cajaActual?.monto_total ?? 0
            ) +
              contribucion.deltaMontoTotal -
              sumaMontoPendienteCreditos
          );

        // -----------------------------------------------------
        // Pendientes de pago
        // -----------------------------------------------------

        const nuevoMontoPendientePago =
          round2(
            Number(
              cajaActual?.monto_pendiente_pago ??
                0
            ) +
              sumaMontoPendienteCreditos
          );

        // -----------------------------------------------------
        // Deuda
        // -----------------------------------------------------

        const nuevoMontoDeuda =
          round2(
            Number(
              cajaActual?.monto_deuda ?? 0
            ) +
              contribucion.deltaMontoDeuda
          );

        // -----------------------------------------------------
        // Inversión
        // -----------------------------------------------------

        const nuevoMontoInversion =
          round2(
            Number(
              cajaActual?.monto_inversion ?? 0
            ) +
              contribucion.deltaMontoInversion
          );

        // -----------------------------------------------------
        // Ganancia
        // -----------------------------------------------------

        const nuevoMontoGanancia =
          round2(
            Number(
              cajaActual?.monto_ganancia ?? 0
            ) +
              contribucion.deltaMontoGanancia
          );

        // -----------------------------------------------------
        // Pérdida
        // -----------------------------------------------------

        const nuevoMontoPerdida =
          round2(
            Number(
              cajaActual?.monto_perdida ?? 0
            ) +
              contribucion.deltaMontoPerdida
          );

        // -----------------------------------------------------
        // MOVIMIENTO EXTERNO
        // -----------------------------------------------------
        //
        // Se acumula el monto_total del movimiento externo
        // en Caja.monto_movimiento.
        //
        // Ejemplo:
        //
        // Caja.monto_movimiento = 100.000
        // Nuevo movimiento       =  25.000
        // Nuevo valor            = 125.000
        //
        // Esto ocurre tanto para ingreso como para egreso.
        //

        const nuevoMontoMovimiento =
          round2(
            Number(
              cajaActual?.monto_movimiento ?? 0
            ) +
              contribucion.deltaMontoMovimiento
          );

        // -----------------------------------------------------
        // REGISTRAR IMPACTO EN CAJA
        // -----------------------------------------------------

        await registrarImpactoCaja(tx, {
          monto_total: nuevoMontoTotalCaja,

          monto_pendiente_pago:
            nuevoMontoPendientePago,

          monto_deuda:
            nuevoMontoDeuda,

          monto_inversion:
            nuevoMontoInversion,

          monto_ganancia:
            nuevoMontoGanancia,

          monto_perdida:
            nuevoMontoPerdida,

          // NUEVO:
          // acumulado de los movimientos externos.
          monto_movimiento:
            nuevoMontoMovimiento,

          tipo_impacto:
            "movimiento_externo",

          referencia_id:
            nuevoMovimiento.id,

          fecha:
            nuevoMovimiento.fecha_movimiento,
        });

        return nuevoMovimiento;
      }
    );

    return NextResponse.json(
      {
        ok: true,
        movimiento,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      "Error al crear movimiento externo:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al guardar el movimiento",
      },
      { status: 500 }
    );
  }
}