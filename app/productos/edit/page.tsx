import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductoForm } from "@/components/ProductoForm";

export default async function EditarProductoPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = parseInt(searchParams.id ?? "", 10);
  if (Number.isNaN(id)) notFound();

  const producto = await prisma.productos.findUnique({ where: { id } });
  if (!producto) notFound();

  return (
    <ProductoForm
      producto={{
        id: producto.id,
        created: producto.created ? producto.created.toISOString() : null,
        modified: producto.modified ? producto.modified.toISOString() : null,
        descripcion: producto.descripcion,
        precio: Number(producto.precio),
        precioCosto: producto.precio_costo !== null ? Number(producto.precio_costo) : null,
        nota: producto.nota,
        stockDisponible: producto.stock_disponible,
        proveedor: producto.proveedor,
        habilitado: producto.habilitado as "si" | "no",
      }}
    />
  );
}
