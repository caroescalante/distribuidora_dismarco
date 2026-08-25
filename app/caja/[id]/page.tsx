import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ETIQUETAS_TIPO: Record<string, string> = {
  ganancia: "Ganancia",
  perdida: "Pérdida",
  inversion: "Inversión",
  deuda: "Pago deuda",
  correccion: "Corrección",
  movimiento_externo: "Movimiento externo",
  creditos_clientes: "Nota de crédito",
};

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(fecha: Date | null) {
  if (!fecha) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

function Campo({
  label,
  valor,
  color,
  destacado,
}: {
  label: string;
  valor: string;
  color?: "emerald" | "rose";
  destacado?: boolean;
}) {
  const colorClase =
    color === "emerald"
      ? "text-emerald-700"
      : color === "rose"
      ? "text-rose-700"
      : "text-slate-800";

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p
        className={`font-mono font-semibold ${colorClase} ${
          destacado ? "text-base" : "text-sm"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

export default async function DetalleCajaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  if (Number.isNaN(id)) notFound();

  const registro = await prisma.caja.findUnique({
    where: { id },
  });

  if (!registro) notFound();

  const esGanancia = registro.tipo_impacto === "ganancia";
  const esPerdida = registro.tipo_impacto === "perdida";
  const esDeuda = registro.tipo_impacto === "deuda";
  const esCorreccion = registro.tipo_impacto === "correccion";
  const esOtro = !esGanancia && !esPerdida && !esDeuda && !esCorreccion;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full sm:max-w-xl mx-auto min-h-screen flex flex-col pb-10">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-6 pb-2">
          <Link
            href="/caja"
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">Registro #{registro.id}</p>
            <h1 className="text-lg font-bold text-slate-900">Detalle de caja</h1>
          </div>
        </div>

        <div className="px-4 sm:px-6 mt-4 flex flex-col gap-3">
          {/* Tipo + fecha */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
            <span
              className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                esGanancia
                  ? "bg-emerald-100 text-emerald-700"
                  : esPerdida
                  ? "bg-rose-100 text-rose-700"
                  : esDeuda
                  ? "bg-slate-200 text-slate-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {ETIQUETAS_TIPO[registro.tipo_impacto] ?? registro.tipo_impacto}
            </span>
            <p className="text-xs text-slate-500">{formatearFecha(registro.fecha)}</p>
          </div>

          {/* Montos */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Montos
            </p>

            <Campo
              label="Monto total (caja)"
              valor={formatearMoneda(Number(registro.monto_total))}
              destacado
            />

            {esGanancia && (
              <Campo
                label="Ganancia acumulada"
                valor={formatearMoneda(Number(registro.monto_ganancia))}
                color="emerald"
              />
            )}

            {esPerdida && (
              <Campo
                label="Pérdida acumulada"
                valor={formatearMoneda(Number(registro.monto_perdida))}
                color="rose"
              />
            )}

            {esDeuda && (
              <>
                <Campo
                  label="Deuda pendiente"
                  valor={formatearMoneda(Number(registro.monto_deuda))}
                />
                <Campo
                  label="Destinado a deuda (acumulado)"
                  valor={formatearMoneda(Number(registro.monto_destinado_deuda))}
                />
                <Campo
                  label="¿Dinero extraído de la caja?"
                  valor={registro.dinero_extraido === "si" ? "Sí" : "No"}
                />
              </>
            )}

            {esOtro && (
              <Campo
                label="Pendiente de pago (NC)"
                valor={formatearMoneda(Number(registro.monto_pendiente_pago))}
              />
            )}

            {esCorreccion && (
              <>
                <Campo
                  label="Ganancia acumulada"
                  valor={formatearMoneda(Number(registro.monto_ganancia))}
                />
                <Campo
                  label="Pérdida acumulada"
                  valor={formatearMoneda(Number(registro.monto_perdida))}
                />
                <Campo
                  label="Deuda pendiente"
                  valor={formatearMoneda(Number(registro.monto_deuda))}
                />
                <Campo
                  label="Inversión acumulada"
                  valor={formatearMoneda(Number(registro.monto_inversion))}
                />
              </>
            )}
          </div>

          {/* Nota */}
          {registro.nota && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Nota
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{registro.nota}</p>
            </div>
          )}

          {/* Referencia */}
          {registro.referencia_id && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Referencia
              </p>
              <p className="text-sm text-slate-700 font-mono">#{registro.referencia_id}</p>
            </div>
          )}

          {registro.monto_movimiento && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Monto del movimiento
              </p>
              <p className="text-sm text-slate-700 font-mono">{formatearMoneda(Number(registro.monto_movimiento))}</p>
            </div>
          )}

            </div>
        </div>
      </div>
    // </div>
  );
}