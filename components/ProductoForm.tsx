"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  RefreshCw,
  FileText,
  Wallet,
  StickyNote,
  Boxes,
  Truck,
  Sparkles,
  Check,
  Loader2,
  Minus,
  Plus,
  LucideIcon
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
function numberToDigits(n: number) {
  return String(Math.round(n * 100));
}

// Redondea al medio más cercano: 1.4 -> 1.5, 1.2 -> 1, 1.6 -> 1.5, etc.
function roundToHalf(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 2) / 2;
}

function formatearStock(n: number) {
  // Muestra "1" en vez de "1.0" y "1.5" cuando corresponde
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatearFechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
      <Icon size={13} className="text-slate-400" />
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {title}
      </p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

type ProductoExistente = {
  id: number;
  created: string | null;
  modified: string | null;
  descripcion: string;
  precio: number;
  precioCosto: number | null;
  nota: string | null;
  stockDisponible: number | null;
  proveedor: string | null;
  habilitado: "si" | "no";
};

type Props = {
  producto?: ProductoExistente;
};

export function ProductoForm({ producto }: Props) {
  const router = useRouter();
  const esEdicion = Boolean(producto);

  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [precioDigits, setPrecioDigits] = useState(
    producto ? numberToDigits(producto.precio) : ""
  );
  const [precioCostoDigits, setPrecioCostoDigits] = useState(
    producto?.precioCosto != null ? numberToDigits(producto.precioCosto) : ""
  );
  const [nota, setNota] = useState(producto?.nota ?? "");
  const [stockDisponible, setStockDisponible] = useState(
    producto?.stockDisponible != null ? formatearStock(producto.stockDisponible) : "0"
  );
  const [proveedor, setProveedor] = useState(producto?.proveedor ?? "");
  const [habilitado, setHabilitado] = useState<"si" | "no">(producto?.habilitado ?? "si");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precio = digitsToNumber(precioDigits);
  const precioCosto = precioCostoDigits ? digitsToNumber(precioCostoDigits) : null;

  const isValid = descripcion.trim() !== "" && precioDigits !== "" && precio > 0;

  function ajustarStock(delta: number) {
    setStockDisponible((prev) => {
      const actual = roundToHalf(parseFloat(prev || "0"));
      const siguiente = Math.max(0, actual + delta);
      return formatearStock(siguiente);
    });
  }

  function normalizarStock() {
    setStockDisponible((prev) => {
      const n = roundToHalf(Math.max(0, parseFloat(prev || "0")));
      return formatearStock(n);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    // Nos aseguramos de mandar siempre un múltiplo de 0.5, sin importar
    // si el usuario llegó a disparar el blur del input o no.
    const stockFinal = roundToHalf(Math.max(0, parseFloat(stockDisponible || "0")));

    try {
      const url = esEdicion ? `/api/productos/${producto!.id}` : "/api/productos";
      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: descripcion.trim(),
          precio,
          precio_costo: precioCosto,
          nota: nota.trim() ? nota.trim() : null,
          stock_disponible: stockFinal,
          proveedor: proveedor.trim() ? proveedor.trim() : null,
          habilitado,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar el producto");
      }

      router.push("/productos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-sm sm:max-w-xl md:max-w-2xl min-h-screen flex flex-col pb-28 px-0 sm:px-2">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 px-5 mt-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:items-start"
        >
          {/* Fechas del sistema */}
          <Card title="Datos del sistema">
            <div>
              <FieldLabel icon={Calendar}>Creado</FieldLabel>
              <input
                type="text"
                value={producto?.created ? formatearFechaHora(producto.created) : "Se asigna al guardar"}
                disabled
                className={`${inputBase} cursor-not-allowed text-slate-400`}
              />
            </div>
            <div>
              <FieldLabel icon={RefreshCw}>Última modificación</FieldLabel>
              <input
                type="text"
                value={
                  producto?.modified ? formatearFechaHora(producto.modified) : "Se asigna al guardar"
                }
                disabled
                className={`${inputBase} cursor-not-allowed text-slate-400`}
              />
            </div>
          </Card>

          {/* Estado */}
          <Card title="Estado">
            <div>
              <FieldLabel icon={Check}>Habilitado</FieldLabel>
              <select
                value={habilitado}
                onChange={(e) => setHabilitado(e.target.value as "si" | "no")}
                className={`${inputBase} appearance-none`}
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
              {habilitado === "no" && (
                <p className="text-[11px] text-amber-600 mt-1.5">
                  Un producto deshabilitado no va a aparecer en el buscador al cargar movimientos.
                </p>
              )}
            </div>
          </Card>

          {/* Datos del producto */}
          <div className="sm:col-span-2">
            <Card title="Datos del producto">
              <div>
                <FieldLabel icon={FileText}>Descripción</FieldLabel>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Coca Cola 500ml"
                  className={inputBase}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel icon={Wallet}>Precio</FieldLabel>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={precioDigits ? formatearMoneda(precio) : ""}
                    onChange={(e) => setPrecioDigits(e.target.value.replace(/\D/g, ""))}
                    placeholder="$ 0,00"
                    className={`${inputBase} font-mono`}
                  />
                </div>
                <div>
                  <FieldLabel icon={Boxes}>Stock disponible</FieldLabel>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => ajustarStock(-0.5)}
                      className="w-9 h-[41px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                      aria-label="Restar media unidad"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={stockDisponible}
                      onChange={(e) => {
                        // Permite dígitos y un único punto decimal mientras tipea
                        const v = e.target.value.replace(/[^\d.]/g, "");
                        const partes = v.split(".");
                        const limpio =
                          partes.length > 2 ? `${partes[0]}.${partes.slice(1).join("")}` : v;
                        setStockDisponible(limpio);
                      }}
                      onBlur={normalizarStock}
                      placeholder="0"
                      className={`${inputBase} text-center font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => ajustarStock(0.5)}
                      className="w-9 h-[41px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                      aria-label="Sumar media unidad"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Solo se admiten fracciones de media unidad (0.5, 1, 1.5, 2...).
                  </p>
                </div>
              </div>

              <div>
                <FieldLabel icon={Truck}>Proveedor</FieldLabel>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej: Distribuidora del Sur"
                  className={inputBase}
                />
              </div>

              <div>
                <FieldLabel icon={StickyNote}>Nota</FieldLabel>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Cualquier aclaración adicional..."
                  rows={3}
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div>
                <FieldLabel icon={Sparkles}>Precio de costo</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  value={precioCostoDigits ? formatearMoneda(precioCosto ?? 0) : ""}
                  onChange={(e) => setPrecioCostoDigits(e.target.value.replace(/\D/g, ""))}
                  placeholder="$ 0,00"
                  className={`${inputBase} font-mono`}
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Estimado y calculado por el sistema a partir de tus últimas compras. Podés
                  editarlo a mano si hace falta.
                </p>
              </div>
            </Card>
          </div>

          {error && (
            <div className="sm:col-span-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            </div>
          )}
        </form>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm sm:max-w-xl md:max-w-2xl">
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
              "Guardar producto"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}