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

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

export default function NuevoRegistroCajaPage() {
  const router = useRouter();

  const [tipo, setTipo] = useState<
    "ganancia" | "perdida" | "deuda" | ""
  >("");

  const [dineroExtraido, setDineroExtraido] = useState<
    "si" | "no"
  >("si");

  const [montoDigits, setMontoDigits] = useState("");
  const [nota, setNota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camposDineroExtraidoHabilitados = tipo === "deuda";

  const monto = digitsToNumber(montoDigits);

  const isValid = tipo !== "" && monto > 0;

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!isValid || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo_impacto: tipo,
          monto,
          nota: nota.trim() ? nota.trim() : null,
          dinero_extraido: camposDineroExtraidoHabilitados
            ? dineroExtraido
            : "no",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ?? "No se pudo guardar el registro"
        );
      }

      router.push("/caja");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado"
      );

      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full sm:max-w-xl mx-auto min-h-screen flex flex-col pb-8">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-6 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft
              size={16}
              className="text-slate-600"
            />
          </button>

          <h1 className="text-lg font-bold text-slate-900">
            Nuevo registro de caja
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 px-4 sm:px-6 mt-4"
        >
          {/* Formulario */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4">
            {/* Tipo de registro */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Tipo de registro
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Ganancia */}
                <button
                  type="button"
                  onClick={() => setTipo("ganancia")}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                    tipo === "ganancia"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <TrendingUp size={15} />
                  Ganancia
                </button>

                {/* Pérdida */}
                <button
                  type="button"
                  onClick={() => setTipo("perdida")}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                    tipo === "perdida"
                      ? "bg-rose-600 border-rose-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <TrendingDown size={15} />
                  Pérdida
                </button>

                {/* Pago deuda */}
                <button
                  type="button"
                  onClick={() => setTipo("deuda")}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                    tipo === "deuda"
                      ? "bg-slate-800 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Landmark size={15} />
                  Pago deuda
                </button>
              </div>
            </div>

            {/* Dinero extraído */}
            <div>
              <label className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Wallet
                    size={13}
                    className="text-slate-400"
                  />
                  ¿Dinero extraído de la caja?
                </span>

                {!camposDineroExtraidoHabilitados && (
                  <span className="text-[10px] text-slate-400">
                    No aplica a este tipo
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Sí */}
                <button
                  type="button"
                  disabled={
                    !camposDineroExtraidoHabilitados
                  }
                  onClick={() => setDineroExtraido("si")}
                  className={`rounded-xl py-2.5 text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    camposDineroExtraidoHabilitados &&
                    dineroExtraido === "si"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:enabled:bg-slate-50"
                  }`}
                >
                  Sí
                </button>

                {/* No */}
                <button
                  type="button"
                  disabled={
                    !camposDineroExtraidoHabilitados
                  }
                  onClick={() => setDineroExtraido("no")}
                  className={`rounded-xl py-2.5 text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    camposDineroExtraidoHabilitados &&
                    dineroExtraido === "no"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:enabled:bg-slate-50"
                  }`}
                >
                  No
                </button>
              </div>

              {camposDineroExtraidoHabilitados && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {dineroExtraido === "si"
                    ? "El monto también se va a descontar de la caja, además de mover la deuda."
                    : "La deuda se mueve igual, pero no se toca el monto total de la caja."}
                </p>
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <Wallet
                  size={13}
                  className="text-slate-400"
                />
                Monto
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  montoDigits
                    ? formatearMoneda(monto)
                    : ""
                }
                onChange={(e) => {
                  const digits =
                    e.target.value.replace(/\D/g, "");

                  setMontoDigits(digits);
                }}
                placeholder="$ 0,00"
                className={`${inputBase} font-mono text-base`}
              />
            </div>

            {/* Nota */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <FileText
                  size={13}
                  className="text-slate-400"
                />
                Nota (opcional)
              </label>

              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Cualquier aclaración adicional..."
                rows={3}
                maxLength={200}
                className={`${inputBase} resize-none`}
              />
            </div>

            {/* Resumen */}
            {tipo && monto > 0 && (
              <p className="text-[11px] text-slate-500">
                {tipo === "ganancia" && (
                  <>
                    Se va a sumar{" "}
                    {formatearMoneda(monto)} al monto
                    total de la caja y al acumulado de
                    ganancias.
                  </>
                )}

                {tipo === "perdida" && (
                  <>
                    Se va a restar{" "}
                    {formatearMoneda(monto)} del monto
                    total de la caja y se suma al acumulado
                    de pérdidas.
                  </>
                )}

                {tipo === "deuda" && (
                  <>
                    Se va a restar{" "}
                    {formatearMoneda(monto)} de la deuda
                    pendiente y se suma al acumulado
                    destinado a pagar deuda. No afecta el
                    monto total de la caja.
                  </>
                )}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
              <p className="text-xs text-rose-600 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Guardar */}
          <div className="mt-1 pb-6">
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full bg-slate-900 disabled:bg-slate-300 hover:enabled:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Guardando...
                </>
              ) : (
                "Guardar registro"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}