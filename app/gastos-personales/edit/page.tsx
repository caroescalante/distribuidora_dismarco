import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { GastosPersonalesForm } from "@/components/GastosPersonalesForm";

export default async function EditarGastoPersonal({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = parseInt(searchParams.id ?? "", 10);

  if (Number.isNaN(id)) {
    notFound();
  }

  const gasto = await prisma.gastospersonales.findUnique({
    where: { id },
  });

  if (!gasto) {
    notFound();
  }

  return (
    <GastosPersonalesForm
      gasto={{
        id: gasto.id,
        created: gasto.created?.toISOString() ?? "",
        fechaPago: gasto.fecha_pago.toISOString().slice(0, 10),
        descripcion: gasto.descripcion,
        monto: Number(gasto.monto),
      }}
    />
  );
}