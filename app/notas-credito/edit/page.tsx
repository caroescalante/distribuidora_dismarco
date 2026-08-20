import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotaCreditoForm } from "@/components/NotaCreditoForm";

export default async function EditarGastoPersonalPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = parseInt(searchParams.id ?? "", 10);
  if (Number.isNaN(id)) notFound();

  const credito = await prisma.creditosclientes.findUnique({
    where: { id },
  });

  if (!credito) notFound();

  return (
    <NotaCreditoForm
      credito={{
        id: credito.id,
        nombreCliente: credito.nombre_cliente ?? "",
        descripcion: credito.descripcion,
        montoTotal: Number(credito.monto_total ?? 0),
        montoPago: Number(credito.monto_pago ?? 0),
        estado: credito.estado as "no_pago" | "pago",
        fecha: (credito.fecha ?? new Date()).toISOString(),
      }}
    />
  );
}
