import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  obtenerCajaActual,
  registrarImpactoCaja,
} from "@/lib/caja";
import {
  calcularContribucionMovimiento,
} from "@/lib/movimientoCaja";

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
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const movimientoActual =
      await prisma.movimientosexternos.findUnique({
        where: { id },
      });

    if (!movimientoActual) {
      return NextResponse.json(
        { error: "No se encontró el movimiento" },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    const tipo_movimiento =
      formData.get("tipo_movimiento") as string | null;

    const pago =
      formData.get("pago") as string | null;

    const medio_de_pago =
      formData.get("medio_de_pago") as string | null;

    const nota =
      formData.get("nota") as string | null;

    const file =
      formData.get("comprobante") as File | null;

    const productosRaw =
      formData.get("productos") as string | null;

    const factura =
      (formData.get("factura") as string | null) ?? "no";

    const entregado =
      (formData.get("entregado") as string | null) ?? "no";

    const montoTotalPagadoRaw =
      formData.get(
        "monto_total_pagado"
      ) as string | null;

    if (
      !tipo_movimiento ||
      !pago ||
      !medio_de_pago ||
      !productosRaw
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (
      !["ingreso", "egreso"].includes(
        tipo_movimiento
      )
    ) {
      return NextResponse.json(
        { error: "tipo_movimiento inválido" },
        { status: 400 }
      );
    }

    if (
      tipo_movimiento !==
      movimientoActual.tipo_movimiento
    ) {
      return NextResponse.json(
        {
          error:
            "El tipo de movimiento no se puede cambiar una vez creado.",
        },
        { status: 400 }
      );
    }

    if (
      ![
        "efectivo",
        "transferencia",
        "tarjeta",
        "varios",
      ].includes(medio_de_pago)
    ) {
      return NextResponse.json(
        { error: "medio_de_pago inválido" },
        { status: 400 }
      );
    }

    if (
      !["si", "no"].includes(pago) ||
      !["si", "no"].includes(factura) ||
      !["si", "no"].includes(entregado)
    ) {
      return NextResponse.json(
        {
          error:
            "Valor inválido en pago/factura/entregado",
        },
        { status: 400 }
      );
    }

    let productos: ProductoLinea[];

    try {
      productos = JSON.parse(productosRaw);
    } catch {
      return NextResponse.json(
        {
          error:
            "Formato de productos inválido",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "El movimiento necesita al menos un producto",
        },
        { status: 400 }
      );
    }

    const productoIds = [
      ...new Set(
        productos.map(
          (p) => p.producto_id
        )
      ),
    ];

    const productosDb =
      await prisma.productos.findMany({
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
      productosDb.map((p) => [
        p.id,
        Number(p.precio),
      ])
    );

    for (const p of productos) {
      if (
        !precioPorId.has(
          p.producto_id
        )
      ) {
        return NextResponse.json(
          {
            error: `El producto "${p.nombre}" ya no existe`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(
          p.cantidad
        ) ||
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

    const cantidad_total =
      productos.reduce(
        (acc, p) =>
          acc + p.cantidad,
        0
      );

    const normalTotal = round2(
      productos.reduce(
        (acc, p) =>
          acc +
          precioPorId.get(
            p.producto_id
          )! *
            p.cantidad,
        0
      )
    );

    let monto_total: number;
    let ganancia = 0;
    let perdida = 0;
    let factor = 1;

    if (
      tipo_movimiento ===
      "ingreso"
    ) {
      if (!montoTotalPagadoRaw) {
        return NextResponse.json(
          {
            error:
              "Falta el monto total pagado",
          },
          { status: 400 }
        );
      }

      monto_total = Number(
        montoTotalPagadoRaw
      );

      if (
        Number.isNaN(
          monto_total
        ) ||
        monto_total <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "monto_total_pagado inválido",
          },
          { status: 400 }
        );
      }

      factor =
        normalTotal > 0
          ? monto_total /
            normalTotal
          : 1;

      const diferencia =
        round2(
          normalTotal -
            monto_total
        );

      if (diferencia > 0) {
        ganancia = diferencia;
      } else if (
        diferencia < 0
      ) {
        perdida =
          round2(-diferencia);
      }
    } else {
      monto_total =
        normalTotal;
    }

    const descripcion =
      productos
        .map((p) => {
          const precio =
            precioPorId.get(
              p.producto_id
            )!;

          return `${p.cantidad} x ${p.nombre} ($${precio.toFixed(
            2
          )} c/u)`;
        })
        .join("\n");

    let nro_comprobante =
      movimientoActual.nro_comprobante;

    if (
      file &&
      file.size > 0
    ) {
      if (
        !ACCEPTED_TYPES.includes(
          file.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Formato de comprobante no soportado. Usá PDF, JPG o PNG.",
          },
          { status: 400 }
        );
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        return NextResponse.json(
          {
            error:
              "El comprobante no puede superar los 10MB",
          },
          { status: 400 }
        );
      }

      const bytes =
        await file.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      const uploadsDir =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "comprobantes"
        );

      await mkdir(
        uploadsDir,
        {
          recursive: true,
        }
      );

      const ext =
        file.name
          .split(".")
          .pop() ?? "bin";

      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      await writeFile(
        path.join(
          uploadsDir,
          filename
        ),
        buffer
      );

      nro_comprobante =
        `/uploads/comprobantes/${filename}`;
    }

    const resultado =
      await prisma.$transaction(
        async (tx) => {
          const actualizado =
            await tx.movimientosexternos.update(
              {
                where: { id },
                data: {
                  tipo_movimiento:
                    tipo_movimiento as
                      | "ingreso"
                      | "egreso",

                  descripcion,

                  monto_total,

                  cantidad_total,

                  pago:
                    pago as
                      | "si"
                      | "no",

                  medio_de_pago:
                    medio_de_pago as
                      | "efectivo"
                      | "transferencia"
                      | "tarjeta"
                      | "varios",

                  factura:
                    tipo_movimiento ===
                    "egreso"
                      ? (factura as
                          | "si"
                          | "no")
                      : "no",

                  entregado:
                    tipo_movimiento ===
                    "egreso"
                      ? (entregado as
                          | "si"
                          | "no")
                      : "no",

                  estado:
                    tipo_movimiento ===
                    "ingreso"
                      ? "retirado"
                      : null,

                  nota:
                    nota &&
                    nota.trim() !== ""
                      ? nota
                      : null,

                  nro_comprobante,

                  monto_ganancia_generada:
                    ganancia,

                  monto_perdida_generada:
                    perdida,

                  modified:
                    new Date(),
                },
              }
            );

          const lineasViejas =
            await tx.movimientosexternosproductos.findMany(
              {
                where: {
                  movimiento_externo_id:
                    id,
                },
                select: {
                  producto_id:
                    true,
                  cantidad:
                    true,
                },
              }
            );

          await tx.movimientosexternosproductos.deleteMany(
            {
              where: {
                movimiento_externo_id:
                  id,
              },
            }
          );

          await tx.movimientosexternosproductos.createMany(
            {
              data: productos.map(
                (p) => {
                  const precioCatalogo =
                    precioPorId.get(
                      p.producto_id
                    )!;

                  const precioUnitario =
                    tipo_movimiento ===
                    "ingreso"
                      ? round2(
                          precioCatalogo *
                            factor
                        )
                      : precioCatalogo;

                  return {
                    movimiento_externo_id:
                      id,

                    producto_id:
                      p.producto_id,

                    nombre_producto:
                      p.nombre,

                    cantidad:
                      p.cantidad,

                    precio_unitario:
                      precioUnitario,
                  };
                }
              ),
            }
          );

          if (
            movimientoActual.tipo_movimiento ===
            "ingreso"
          ) {
            for (const linea of lineasViejas) {
              if (
                linea.producto_id ===
                null
              ) {
                continue;
              }

              await tx.productos.update(
                {
                  where: {
                    id: linea.producto_id,
                  },
                  data: {
                    stock_disponible:
                      {
                        decrement:
                          linea.cantidad,
                      },
                  },
                }
              );
            }
          } else {
            for (const linea of lineasViejas) {
              if (
                linea.producto_id ===
                null
              ) {
                continue;
              }

              await tx.productos.update(
                {
                  where: {
                    id: linea.producto_id,
                  },
                  data: {
                    stock_disponible:
                      {
                        increment:
                          linea.cantidad,
                      },
                  },
                }
              );
            }
          }

          if (
            tipo_movimiento ===
            "ingreso"
          ) {
            for (const p of productos) {
              const precioCatalogo =
                precioPorId.get(
                  p.producto_id
                )!;

              await tx.productos.update(
                {
                  where: {
                    id: p.producto_id,
                  },
                  data: {
                    precio_costo:
                      round2(
                        precioCatalogo *
                          factor
                      ),
                    stock_disponible:
                      {
                        increment:
                          p.cantidad,
                      },
                  },
                }
              );
            }
          } else {
            for (const p of productos) {
              await tx.productos.update(
                {
                  where: {
                    id: p.producto_id,
                  },
                  data: {
                    stock_disponible:
                      {
                        decrement:
                          p.cantidad,
                      },
                  },
                }
              );
            }
          }

                  const viejo =
            calcularContribucionMovimiento(
              movimientoActual.tipo_movimiento as
                | "ingreso"
                | "egreso",

              Number(
                movimientoActual.monto_total
              ),

              movimientoActual.medio_de_pago,

              Number(
                movimientoActual.monto_ganancia_generada ??
                  0
              ),

              Number(
                movimientoActual.monto_perdida_generada ??
                  0
              ),

              Number(
                movimientoActual.monto_total
              )
            );

          const nuevo =
            calcularContribucionMovimiento(
              tipo_movimiento as
                | "ingreso"
                | "egreso",

              monto_total,

              medio_de_pago,

              ganancia,

              perdida,

              monto_total
            );

          const deltaMontoTotal =
            round2(
              nuevo.deltaMontoTotal -
                viejo.deltaMontoTotal
            );

          const deltaMontoDeuda =
            round2(
              nuevo.deltaMontoDeuda -
                viejo.deltaMontoDeuda
            );

          const deltaMontoInversion =
            round2(
              nuevo.deltaMontoInversion -
                viejo.deltaMontoInversion
            );

          const deltaMontoGanancia =
            round2(
              nuevo.deltaMontoGanancia -
                viejo.deltaMontoGanancia
            );

          const deltaMontoPerdida =
            round2(
              nuevo.deltaMontoPerdida -
                viejo.deltaMontoPerdida
            );

          const deltaMontoMovimiento =
            round2(
              nuevo.deltaMontoMovimiento -
                viejo.deltaMontoMovimiento
            );

          if (
            deltaMontoTotal !==
              0 ||
            deltaMontoDeuda !==
              0 ||
            deltaMontoInversion !==
              0 ||
            deltaMontoGanancia !==
              0 ||
            deltaMontoPerdida !==
              0 ||
            deltaMontoMovimiento !==
              0
          ) {
            const cajaActual =
              await obtenerCajaActual(
                tx
              );

            await registrarImpactoCaja(
              tx,
              {
                monto_total:
                  round2(
                    Number(
                      cajaActual?.monto_total ??
                        0
                    ) +
                      deltaMontoTotal
                  ),

                monto_deuda:
                  round2(
                    Number(
                      cajaActual?.monto_deuda ??
                        0
                    ) +
                      deltaMontoDeuda
                  ),

                monto_inversion:
                  round2(
                    Number(
                      cajaActual?.monto_inversion ??
                        0
                    ) +
                      deltaMontoInversion
                  ),

                monto_ganancia:
                  round2(
                    Number(
                      cajaActual?.monto_ganancia ??
                        0
                    ) +
                      deltaMontoGanancia
                  ),

                monto_perdida:
                  round2(
                    Number(
                      cajaActual?.monto_perdida ??
                        0
                    ) +
                      deltaMontoPerdida
                  ),

                monto_movimiento:
                  round2(
                    Number(
                      cajaActual?.monto_movimiento ??
                        0
                    ) +
                      deltaMontoMovimiento
                  ),

                tipo_impacto:
                  "movimiento_externo",

                referencia_id:
                  id,
              }
            );
          }

          return actualizado;
        }
      );

    return NextResponse.json({
      ok: true,
      movimiento: resultado,
    });
  } catch (err) {
    console.error(
      "Error al actualizar movimiento externo:",
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
    const id = parseInt(
      params.id,
      10
    );

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const movimiento =
      await prisma.movimientosexternos.findUnique(
        {
          where: { id },
        }
      );

    if (!movimiento) {
      return NextResponse.json(
        {
          error:
            "No se encontró el movimiento",
        },
        { status: 404 }
      );
    }

    const creditosAsociados =
      await prisma.creditosclientes.findMany(
        {
          where: {
            movimiento_externo_id:
              id,
          },
          select: {
            estado: true,
            monto_pendiente: true,
          },
        }
      );

    const lineasProductos =
      await prisma.movimientosexternosproductos.findMany(
        {
          where: {
            movimiento_externo_id:
              id,
          },
          select: {
            producto_id: true,
            cantidad: true,
          },
        }
      );

    await prisma.$transaction(
      async (tx) => {
        const cajaActual =
          await obtenerCajaActual(tx);

        const viejo =
          calcularContribucionMovimiento(
            movimiento.tipo_movimiento as
              | "ingreso"
              | "egreso",

            Number(
              movimiento.monto_total
            ),

            movimiento.medio_de_pago,

            Number(
              movimiento.monto_ganancia_generada ??
                0
            ),

            Number(
              movimiento.monto_perdida_generada ??
                0
            ),

            Number(
              movimiento.monto_total
            )
          );

        let montoTotalNuevo =
          round2(
            Number(
              cajaActual?.monto_total ??
                0
            ) -
              viejo.deltaMontoTotal
          );

        let montoPendientePagoNuevo =
          Number(
            cajaActual?.monto_pendiente_pago ??
              0
          );

        const montoDeudaNuevo =
          round2(
            Number(
              cajaActual?.monto_deuda ??
                0
            ) -
              viejo.deltaMontoDeuda
          );

        const montoInversionNuevo =
          round2(
            Number(
              cajaActual?.monto_inversion ??
                0
            ) -
              viejo.deltaMontoInversion
          );

        const montoGananciaNuevo =
          round2(
            Number(
              cajaActual?.monto_ganancia ??
                0
            ) -
              viejo.deltaMontoGanancia
          );

        const montoPerdidaNuevo =
          round2(
            Number(
              cajaActual?.monto_perdida ??
                0
            ) -
              viejo.deltaMontoPerdida
          );

        // -----------------------------------------------------
        // NOTAS DE CRÉDITO
        // -----------------------------------------------------

        for (const c of creditosAsociados) {
          if (
            c.estado ===
            "no_pago"
          ) {
            const pendiente =
              Number(
                c.monto_pendiente ??
                  0
              );

            montoTotalNuevo =
              round2(
                montoTotalNuevo +
                  pendiente
              );

            montoPendientePagoNuevo =
              round2(
                montoPendientePagoNuevo -
                  pendiente
              );
          }
        }

        // -----------------------------------------------------
        // MONTO DEL MOVIMIENTO
        // -----------------------------------------------------
        //
        // IMPORTANTE:
        //
        // Este valor NO representa el acumulado.
        //
        // Representa el movimiento puntual generado
        // por la eliminación.
        //
        // INGRESO:
        //   +monto_total
        //
        // EGRESO:
        //   -monto_total
        //
        // De esta manera el historial deja registrado
        // claramente qué monto volvió a la caja o
        // qué monto se restó de la caja.
        // -----------------------------------------------------

        const montoMovimientoEliminado =
          round2(
            movimiento.tipo_movimiento ===
              "ingreso"
              ? Number(
                  movimiento.monto_total
                )
              : -Number(
                  movimiento.monto_total
                )
          );

        // -----------------------------------------------------
        // REGISTRO HISTÓRICO DE CAJA
        // -----------------------------------------------------

        await registrarImpactoCaja(
          tx,
          {
            monto_total:
              montoTotalNuevo,

            monto_pendiente_pago:
              montoPendientePagoNuevo,

            monto_deuda:
              montoDeudaNuevo,

            monto_inversion:
              montoInversionNuevo,

            monto_ganancia:
              montoGananciaNuevo,

            monto_perdida:
              montoPerdidaNuevo,

            // NUEVO:
            // Guardamos el monto puntual de la eliminación.
            monto_movimiento:
              montoMovimientoEliminado,

            tipo_impacto:
              "movimiento_externo",

            referencia_id:
              id,

            nota:
              "Movimiento Externo eliminado",
          }
        );

        // -----------------------------------------------------
        // STOCK
        // -----------------------------------------------------

        for (const linea of lineasProductos) {
          if (
            linea.producto_id ===
            null
          ) {
            continue;
          }

          await tx.productos.update(
            {
              where: {
                id: linea.producto_id,
              },
              data: {
                stock_disponible:
                  movimiento.tipo_movimiento ===
                  "ingreso"
                    ? {
                        decrement:
                          linea.cantidad,
                      }
                    : {
                        increment:
                          linea.cantidad,
                      },
              },
            }
          );
        }

        // -----------------------------------------------------
        // ELIMINAR MOVIMIENTO
        // -----------------------------------------------------
        //
        // El registro de CAJA NO se elimina.
        //
        // Solo se elimina el Movimiento Externo.
        //
        // Las líneas y créditos asociados
        // se eliminan por cascade según el schema.
        // -----------------------------------------------------

        await tx.movimientosexternos.delete(
          {
            where: { id },
          }
        );
      }
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error(
      "Error al eliminar movimiento externo:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al eliminar el movimiento",
      },
      { status: 500 }
    );
  }
}