import { prisma } from "@/lib/prisma";
import { EditarCajaForm } from "../../../components/EditarCajaForm";

export const dynamic = "force-dynamic";

export default async function EditarCajaPage() {
  const ultimoRegistro = await prisma.caja.findFirst({
    orderBy: { id: "desc" },
  });

  return (
    <EditarCajaForm
      initial={{
        monto_total: Number(ultimoRegistro?.monto_total ?? 0),
        monto_ganancia: Number(ultimoRegistro?.monto_ganancia ?? 0),
        monto_perdida: Number(ultimoRegistro?.monto_perdida ?? 0),
        monto_deuda: Number(ultimoRegistro?.monto_deuda ?? 0),
        monto_inversion: Number(ultimoRegistro?.monto_inversion ?? 0),
      }}
    />
  );
}