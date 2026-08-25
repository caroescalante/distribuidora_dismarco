"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Loader2,
  TrendingUp,
  TrendingDown,
  Landmark,
  Briefcase,
  FileText,
} from "lucide-react";

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function digitsToNumber(digits: string) {
  return parseInt(digits || "0", 10) / 100;
}

function numberToDigits(valor: number) {
  return Math.round(Math.abs(valor) * 100).toString();
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

interface CajaEditableValores {
  monto_total: number;
  monto_ganancia: number;
  monto_perdida: number;
  monto_deuda: number;
  monto_inversion: number;
}

function CampoMonto({
  label,
  icon,
  digits,
  onChangeDigits,
  negativo,
  onToggleNegativo,
}: {
  label: string;
  icon: React.ReactNode;
  digits: string;
  onChangeDigits: (digits: string) => void;
  negativo?: boolean;
  onToggleNegativo?: () => void;
}) {
  const monto = digitsToNumber(digits);

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
        {icon}
        {label}
      </label>

      <div className="flex gap-2">
        {onToggleNegativo && (
          <button
            type="button"
            onClick={onToggleNegativo}
            className={`w-11 shrink-0 rounded-xl border text-sm font-bold transition-colors ${
              negativo
                ? "bg-rose-600 border-rose-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {negativo ? "−" : "+"}
          </button>
        )}

        <input
          type="text"
          inputMode="numeric"
          value={digits ? formatearMoneda(monto) : ""}
          onChange={(e) =>
            onChangeDigits(e.target.value.replace(/\D/g, ""))
          }
          placeholder="$ 0,00"
          className={`${inputBase} font-mono text-base`}
        />
      </div>
    </div>
  );
}

export function EditarCajaForm({
  initial,
}: {
  initial: CajaEditableValores;
}) {
  const router = useRouter();

  const [totalNegativo, setTotalNegativo] = useState(
    initial.monto_total < 0
  );
  const [totalDigits, setTotalDigits] = useState(
    numberToDigits(initial.monto_total)
  );
  const [gananciaDigits, setGananciaDigits] = useState(
    numberToDigits(initial.monto_ganancia)
  );
  const [perdidaDigits, setPerdidaDigits] = useState(
    numberToDigits(initial.monto_perdida)
  );
  const [deudaDigits, setDeudaDigits] = useState(
    numberToDigits(initial.monto_deuda)
  );
  const [inversionDigits, setInversionDigits] = useState(
    numberToDigits(initial.monto_inversion)
  );
  const [nota, setNota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoTotal =
    digitsToNumber(totalDigits) * (totalNegativo ? -1 : 1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/caja/correccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto_total: montoTotal,
          monto_ganancia: digitsToNumber(gananciaDigits),
          monto_perdida: digitsToNumber(perdidaDigits),
          monto_deuda: digitsToNumber(deudaDigits),
          monto_inversion: digitsToNumber(inversionDigits),
          nota: nota.trim() ? nota.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo guardar la corrección");
      }

      router.push("/caja");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado"
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full sm:max-w-xl mx-auto min-h-screen flex flex-col pb-8">
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-6 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>

          <h1 className="text-lg font-bold text-slate-900">Editar caja</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 px-4 sm:px-6 mt-4"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4">
            <p className="text-[11px] text-slate-500">
              Esto crea un nuevo registro de tipo <strong>Corrección</strong>{" "}
              en el historial con los valores que cargues acá. No modifica
              registros anteriores.
            </p>

            <CampoMonto
              label="Monto total (caja)"
              icon={<Wallet size={13} className="text-slate-400" />}
              digits={totalDigits}
              onChangeDigits={setTotalDigits}
              negativo={totalNegativo}
              onToggleNegativo={() => setTotalNegativo((v) => !v)}
            />

            <CampoMonto
              label="Ganancia acumulada"
              icon={<TrendingUp size={13} className="text-emerald-500" />}
              digits={gananciaDigits}
              onChangeDigits={setGananciaDigits}
            />

            <CampoMonto
              label="Pérdida acumulada"
              icon={<TrendingDown size={13} className="text-rose-500" />}
              digits={perdidaDigits}
              onChangeDigits={setPerdidaDigits}
            />

            <CampoMonto
              label="Deuda pendiente"
              icon={<Landmark size={13} className="text-slate-400" />}
              digits={deudaDigits}
              onChangeDigits={setDeudaDigits}
            />

            <CampoMonto
              label="Inversión acumulada"
              icon={<Briefcase size={13} className="text-indigo-500" />}
              digits={inversionDigits}
              onChangeDigits={setInversionDigits}
            />

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <FileText size={13} className="text-slate-400" />
                Nota (opcional)
              </label>

              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Motivo de la corrección..."
                rows={3}
                maxLength={200}
                className={`${inputBase} resize-none`}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            </div>
          )}

          <div className="mt-1 pb-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 disabled:bg-slate-300 hover:enabled:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar corrección"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}