"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, FileText, Wallet, Check, Loader2 } from "lucide-react";

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function numberToDigits(n: number) {
  return String(Math.round(n * 100));
}
function digitsToNumber(digits: string) {
  return parseInt(digits || "0", 10) / 100;
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
      <Icon size={13} className="text-slate-400" />
      {children}
    </label>
  );
}

type CreditoExistente = {
  id: number;
  nombreCliente: string;
  descripcion: string;
  montoTotal: number;
  montoPago: number;
  estado: "no_pago" | "pago";
  fecha: string;
};

type Props = {
  credito?: CreditoExistente; // si viene, es edición; si no, es alta manual
};

export function NotaCreditoForm({ credito }: Props) {
  const router = useRouter();
  const esEdicion = Boolean(credito);

  const [nombreCliente, setNombreCliente] = useState(credito?.nombreCliente ?? "");
  const [descripcion, setDescripcion] = useState(credito?.descripcion ?? "");
  const [montoTotalDigits, setMontoTotalDigits] = useState(
    credito ? numberToDigits(credito.montoTotal) : ""
  );
  const [montoPagoDigits, setMontoPagoDigits] = useState(
    credito ? numberToDigits(credito.montoPago) : ""
  );
  const [estado, setEstado] = useState<"no_pago" | "pago">(credito?.estado ?? "no_pago");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fecha = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(credito ? new Date(credito.fecha) : new Date()),
    [credito]
  );

  const montoTotal = digitsToNumber(montoTotalDigits);
  const montoPago = digitsToNumber(montoPagoDigits);
  const montoPendiente = montoTotal - montoPago;

  const isValid =
    nombreCliente.trim() !== "" && descripcion.trim() !== "" && montoTotalDigits !== "";

  const cambioAPago = esEdicion && credito!.estado === "no_pago" && estado === "pago";
  const altaComoPago = !esEdicion && estado === "pago";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const url = esEdicion ? `/api/creditos-clientes/${credito!.id}` : "/api/creditos-clientes";
      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_cliente: nombreCliente.trim(),
          descripcion: descripcion.trim(),
          monto_total: montoTotal,
          monto_pago: montoPago,
          estado,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar la nota de crédito");
      }

      router.push("/notas-credito");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-sm min-h-screen flex flex-col pb-28">
        <div className="flex items-center gap-3 px-5 pt-6 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 capitalize truncate">{fecha}</p>
            <h1 className="text-lg font-bold text-slate-900">
              {esEdicion ? "Nota de crédito" : "Nueva nota de crédito"}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 mt-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4">
            <div>
              <FieldLabel icon={Calendar}>Fecha</FieldLabel>
              <input
                type="text"
                value={fecha}
                disabled
                className={`${inputBase} capitalize cursor-not-allowed text-slate-400`}
              />
            </div>

            <div>
              <FieldLabel icon={Users}>Cliente</FieldLabel>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ej: Pablito SRL"
                className={inputBase}
              />
            </div>

            <div>
              <FieldLabel icon={FileText}>Descripción</FieldLabel>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                placeholder="Detalle del pedido no abonado..."
                className={`${inputBase} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel icon={Wallet}>Monto total</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoTotalDigits ? formatearMoneda(montoTotal) : ""}
                  onChange={(e) => setMontoTotalDigits(e.target.value.replace(/\D/g, ""))}
                  placeholder="$ 0,00"
                  className={`${inputBase} font-mono`}
                />
              </div>
              <div>
                <FieldLabel icon={Wallet}>Monto pago</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoPagoDigits ? formatearMoneda(montoPago) : ""}
                  onChange={(e) => setMontoPagoDigits(e.target.value.replace(/\D/g, ""))}
                  placeholder="$ 0,00"
                  className={`${inputBase} font-mono`}
                />
              </div>
            </div>

            <div>
              <FieldLabel icon={Wallet}>Monto pendiente</FieldLabel>
              <input
                type="text"
                value={formatearMoneda(montoPendiente)}
                disabled
                className={`${inputBase} font-mono cursor-not-allowed ${
                  montoPendiente > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              />
            </div>

            <div>
              <FieldLabel icon={Check}>Estado</FieldLabel>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as "no_pago" | "pago")}
                className={`${inputBase} appearance-none`}
              >
                <option value="no_pago">No pago</option>
                <option value="pago">Pago</option>
              </select>
              {cambioAPago && (
                <p className="text-[11px] text-emerald-600 mt-1.5">
                  Al guardar, {formatearMoneda(montoPendiente)} se va a sumar a la caja.
                </p>
              )}
              {altaComoPago && (
                <p className="text-[11px] text-emerald-600 mt-1.5">
                  Se va a cargar directamente como pagada y sumar {formatearMoneda(montoPendiente)} a la caja.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            </div>
          )}
        </form>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full bg-slate-900 disabled:bg-slate-300 hover:enabled:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : esEdicion ? (
              "Guardar cambios"
            ) : (
              "Agregar nota de crédito"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
