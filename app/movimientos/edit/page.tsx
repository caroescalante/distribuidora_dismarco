import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MovimientoForm } from "@/components/MovimientoForm";

export default async function EditarMovimientoPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = parseInt(searchParams.id ?? "", 10);
  if (Number.isNaN(id)) notFound();

  const movimiento = await prisma.movimientosexternos.findUnique({
    where: { id },
    include: {
      movimientosexternosproductos: {
        include: { productos: { select: { stock_disponible: true } } },
      },
    },
  });

  if (!movimiento) notFound();

  return (
    <MovimientoForm
      movimiento={{
        id: movimiento.id,
        fechaMovimiento: movimiento.fecha_movimiento.toISOString(),
        tipoMovimiento: movimiento.tipo_movimiento as "ingreso" | "egreso",
        montoTotal: Number(movimiento.monto_total),
        pago: movimiento.pago as "si" | "no",
        medioDePago: movimiento.medio_de_pago as
          | "efectivo"
          | "transferencia"
          | "tarjeta"
          | "varios",
        factura: (movimiento.factura ?? "no") as "si" | "no",
        entregado: (movimiento.entregado ?? "no") as "si" | "no",
        nota: movimiento.nota,
        nroComprobante: movimiento.nro_comprobante,
        productos: movimiento.movimientosexternosproductos.map((p) => ({
          uid: crypto.randomUUID(),
          productoId: p.producto_id ?? 0,
          nombre: p.nombre_producto,
          precio: Number(p.precio_unitario),
          cantidad: p.cantidad,
          // El stock actual ya tiene restada la cantidad de este mismo movimiento
          // (si es egreso), así que la sumamos de vuelta para que el aviso de
          // stock parta del mismo punto que en un alta nueva.
          stockDisponible:
            p.productos?.stock_disponible !== null && p.productos?.stock_disponible !== undefined
              ? movimiento.tipo_movimiento === "egreso"
                ? p.productos.stock_disponible + p.cantidad
                : p.productos.stock_disponible
              : null,
        })),
      }}
    />
  );
}
