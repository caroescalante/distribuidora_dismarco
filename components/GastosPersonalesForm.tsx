"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

function formatearFechaVisual(fecha: string) {
  if (!fecha) return "";

  const [year, month, day] = fecha.split("-");

  if (!year || !month || !day) return fecha;

  return `${day}/${month}/${year}`;
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

type GastoExistente = {
  id: number;
  created: string;
  fechaPago: string;
  descripcion: string;
  monto: number;
};

type Props = {
  gasto?: GastoExistente;
};

export function GastosPersonalesForm({ gasto }: Props) {
  const router = useRouter();

  const esEdicion = Boolean(gasto);

  const [fechaPago, setFechaPago] = useState(
    gasto?.fechaPago ?? new Date().toISOString().slice(0, 10)
  );

  const [descripcion, setDescripcion] = useState(
    gasto?.descripcion ?? ""
  );

  const [montoDigits, setMontoDigits] = useState(
    gasto ? numberToDigits(gasto.monto) : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monto = digitsToNumber(montoDigits);

  const isValid =
    fechaPago !== "" &&
    descripcion.trim() !== "" &&
    monto > 0;

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const url = esEdicion
        ? `/api/gastos-personales/${gasto!.id}`
        : "/api/gastos-personales";

      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha_pago: fechaPago,
          descripcion: descripcion.trim(),
          monto,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ?? "No se pudo guardar el gasto personal"
        );
      }

      router.push("/gastos-personales");
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
    <main className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-2 pt-6">

          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-lg text-slate-600 shadow-sm active:scale-95"
            aria-label="Volver"
          >
            ←
          </button>

          <h1 className="text-lg font-bold text-slate-900">
            {esEdicion
              ? "Editar gasto personal"
              : "Nuevo gasto personal"}
          </h1>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-3 pb-8 pt-4"
        >
          {/* Card */}
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">

            {/* Creado */}
            {esEdicion && (
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Creado
                </label>

                <input
                  type="text"
                  value={formatearFechaVisual(
                    gasto!.created.slice(0, 10)
                  )}
                  disabled
                  className={`${inputBase} cursor-not-allowed text-slate-400`}
                />
              </div>
            )}

            {/* Fecha de pago */}
            <div className="w-full">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Fecha de pago
              </label>

              <input
                type="date"
                value={fechaPago}
                onChange={(e) =>
                  setFechaPago(e.target.value)
                }
                className={inputBase}
              />
            </div>

            {/* Descripción */}
            <div className="w-full">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Descripción
              </label>

              <textarea
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                maxLength={500}
                rows={4}
                placeholder="Ej: Compra de supermercado"
                className={`${inputBase} resize-none`}
              />

              <div className="mt-1 flex justify-end">
                <span className="text-[10px] text-slate-400">
                  {descripcion.length}/500
                </span>
              </div>
            </div>

            {/* Monto */}
            <div className="w-full">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
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
          </div>

          {/* Error */}
          {error && (
            <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
              <p className="text-xs font-medium text-rose-600">
                {error}
              </p>
            </div>
          )}

          {/* Guardar */}
          <div className="w-full pt-2">
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white shadow-lg transition-colors active:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {submitting
                ? "Guardando..."
                : esEdicion
                ? "Guardar cambios"
                : "Agregar gasto personal"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}