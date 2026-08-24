"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Search,
  Plus,
  X,
  Package,
  Wallet,
  CreditCard,
  Paperclip,
  Receipt,
  Truck,
  Check,
  Loader2,
  Users,
  TrendingUp,
  TrendingDown,
  LucideIcon,
} from "lucide-react";

// ---------- Helpers ----------

function formatearFechaLarga(fecha: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

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

const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXT = ".pdf,.jpg,.jpeg,.png";

// ---------- Types ----------

type ProductoBuscado = {
  id: number;
  descripcion: string;
  precio: number;
  stock_disponible: number | null;
};

type LineaProducto = {
  uid: string;
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stockDisponible: number | null;
};

type LineaCredito = {
  uid: string;
  nombreCliente: string;
  descripcion: string;
  montoTotalDigits: string;
  montoPagoDigits: string;
};

type MovimientoExistente = {
  id: number;
  fechaMovimiento: string;
  tipoMovimiento: "ingreso" | "egreso";
  montoTotal: number;
  pago: "si" | "no";
  medioDePago: "efectivo" | "transferencia" | "tarjeta" | "varios";
  factura: "si" | "no";
  entregado: "si" | "no";
  nota: string | null;
  nroComprobante: string | null;
  productos: LineaProducto[];
};

type Props = {
  movimiento?: MovimientoExistente; // si viene, es edición; si no, es alta
};

// ---------- Reusable UI ----------

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

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20";

// ---------- Component ----------

export function MovimientoForm({ movimiento }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const esEdicion = Boolean(movimiento);

  const [tipoMovimiento, setTipoMovimiento] = useState(movimiento?.tipoMovimiento ?? "");
  const [pago, setPago] = useState(movimiento?.pago ?? "");
  const [medioDePago, setMedioDePago] = useState(movimiento?.medioDePago ?? "");
  const [factura, setFactura] = useState(movimiento?.factura ?? "no");
  const [entregado, setEntregado] = useState(movimiento?.entregado ?? "no");
  const [nota, setNota] = useState(movimiento?.nota ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ProductoBuscado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoBuscado | null>(null);
  const [cantidadProducto, setCantidadProducto] = useState("");
  const [productos, setProductos] = useState<LineaProducto[]>(movimiento?.productos ?? []);

  // Monto pagado real, solo se usa cuando tipoMovimiento === "ingreso"
  const [montoTotalIngresoDigits, setMontoTotalIngresoDigits] = useState(
    movimiento?.tipoMovimiento === "ingreso" ? numberToDigits(movimiento.montoTotal) : ""
  );

  // Notas de crédito (solo tiene sentido cargarlas al crear un egreso)
  const [nombreCliente, setNombreCliente] = useState("");
  const [descripcionCredito, setDescripcionCredito] = useState("");
  const [montoTotalCreditoDigits, setMontoTotalCreditoDigits] = useState("");
  const [montoPagoCreditoDigits, setMontoPagoCreditoDigits] = useState("");
  const [creditos, setCreditos] = useState<LineaCredito[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fecha = useMemo(
    () => formatearFechaLarga(movimiento ? new Date(movimiento.fechaMovimiento) : new Date()),
    [movimiento]
  );

  useEffect(() => {
    if (busqueda.trim().length === 0) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos/search?q=${encodeURIComponent(busqueda)}`);
        const data = await res.json();
        setResultados(data.productos ?? []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  function seleccionarProducto(p: ProductoBuscado) {
    setProductoSeleccionado(p);
    setBusqueda(p.descripcion);
    setMostrarDropdown(false);
    setCantidadProducto("1");
  }

  function agregarProducto() {
    const cantidad = parseInt(cantidadProducto || "0", 10);
    if (!productoSeleccionado || !cantidad || cantidad <= 0) return;

    setProductos((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        productoId: productoSeleccionado.id,
        nombre: productoSeleccionado.descripcion,
        precio: productoSeleccionado.precio,
        cantidad,
        stockDisponible: productoSeleccionado.stock_disponible,
      },
    ]);

    setProductoSeleccionado(null);
    setBusqueda("");
    setCantidadProducto("");
    setResultados([]);
  }

  function quitarProducto(uid: string) {
    setProductos((prev) => prev.filter((p) => p.uid !== uid));
  }

  function cambiarCantidad(uid: string, cantidad: number) {
    if (cantidad <= 0) return;
    setProductos((prev) => prev.map((p) => (p.uid === uid ? { ...p, cantidad } : p)));
  }

  const cantidadTotalCalculada = productos.reduce((acc, p) => acc + p.cantidad, 0);
  // Total "a precio de lista": para egreso ES el monto del movimiento;
  // para ingreso es solo una referencia para comparar contra lo realmente pagado.
  const montoListaCalculado = productos.reduce((acc, p) => acc + p.cantidad * p.precio, 0);

  const montoTotalIngresoPagado = digitsToNumber(montoTotalIngresoDigits);
  const diferenciaIngreso = round2(montoListaCalculado - montoTotalIngresoPagado);

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  function agregarCredito() {
    if (
      !nombreCliente.trim() ||
      !descripcionCredito.trim() ||
      !montoTotalCreditoDigits ||
      !montoPagoCreditoDigits
    )
      return;

    setCreditos((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        nombreCliente: nombreCliente.trim(),
        descripcion: descripcionCredito.trim(),
        montoTotalDigits: montoTotalCreditoDigits,
        montoPagoDigits: montoPagoCreditoDigits,
      },
    ]);

    setNombreCliente("");
    setDescripcionCredito("");
    setMontoTotalCreditoDigits("");
    setMontoPagoCreditoDigits("");
  }

  function quitarCredito(uid: string) {
    setCreditos((prev) => prev.filter((c) => c.uid !== uid));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError("Formato no soportado. Usá PDF, JPG, JPEG o PNG.");
      setArchivo(null);
      return;
    }
    setFileError(null);
    setArchivo(file);
  }

  function clearFile() {
    setArchivo(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const esIngreso = tipoMovimiento === "ingreso";
  const esEgreso = tipoMovimiento === "egreso";

  const isValid =
    tipoMovimiento !== "" &&
    productos.length > 0 &&
    pago !== "" &&
    medioDePago !== "" &&
    (esEgreso || (esIngreso && montoTotalIngresoPagado > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("tipo_movimiento", tipoMovimiento);
      formData.append("pago", pago);
      formData.append("medio_de_pago", medioDePago);
      if (nota.trim()) formData.append("nota", nota.trim());
      if (archivo) formData.append("comprobante", archivo);

      formData.append(
        "productos",
        JSON.stringify(
          productos.map((p) => ({
            producto_id: p.productoId,
            nombre: p.nombre,
            cantidad: p.cantidad,
          }))
        )
      );

      if (esEgreso) {
        formData.append("factura", factura);
        formData.append("entregado", entregado);

        if (!esEdicion) {
          formData.append(
            "creditos",
            JSON.stringify(
              creditos.map((c) => ({
                nombre_cliente: c.nombreCliente,
                descripcion: c.descripcion,
                monto_total: digitsToNumber(c.montoTotalDigits),
                monto_pago: digitsToNumber(c.montoPagoDigits),
              }))
            )
          );
        }
      }

      if (esIngreso) {
        formData.append("monto_total_pagado", String(montoTotalIngresoPagado));
      }

      const url = esEdicion ? `/api/movimientos/${movimiento!.id}` : "/api/movimientos";
      const method = esEdicion ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar el movimiento");
      }

      router.push("/movimientos");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
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
          <div className="min-w-0">
            <p className="text-xs text-slate-500 capitalize truncate">{fecha}</p>
            <h1 className="text-lg font-bold text-slate-900">
              {esEdicion ? "Editar movimiento" : "Nuevo movimiento"}
            </h1>
          </div>
        </div>

        {/* Hero: tipo de movimiento */}
        <div className="px-5 mt-3">
          <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 p-5 text-white shadow-lg shadow-teal-900/10 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <p className="text-xs text-teal-50/80 font-medium mb-2 relative">
              ¿Qué tipo de movimiento es?
            </p>
            <div className="grid grid-cols-2 gap-2 relative">
              <button
                type="button"
                disabled={esEdicion}
                onClick={() => setTipoMovimiento("ingreso")}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  tipoMovimiento === "ingreso"
                    ? "bg-white text-teal-700"
                    : `bg-white/15 text-white ${esEdicion ? "" : "hover:bg-white/25"}`
                } ${esEdicion && tipoMovimiento !== "ingreso" ? "opacity-50" : ""}`}
              >
                Ingreso
              </button>
              <button
                type="button"
                disabled={esEdicion}
                onClick={() => setTipoMovimiento("egreso")}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  tipoMovimiento === "egreso"
                    ? "bg-white text-teal-700"
                    : `bg-white/15 text-white ${esEdicion ? "" : "hover:bg-white/25"}`
                } ${esEdicion && tipoMovimiento !== "egreso" ? "opacity-50" : ""}`}
              >
                Egreso
              </button>
            </div>
            {esEdicion && (
              <p className="text-[11px] text-teal-50/70 mt-2 relative">
                El tipo de movimiento no se puede cambiar una vez creado.
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 px-5 mt-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:items-start"
        >
          {/* Fecha */}
          <Card title="Datos generales">
            <div>
              <FieldLabel icon={Calendar}>Fecha del movimiento</FieldLabel>
              <input
                type="text"
                value={fecha}
                disabled
                className={`${inputBase} capitalize cursor-not-allowed text-slate-400`}
              />
            </div>
          </Card>

          {/* Pago */}
          <Card title="Pago">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel icon={Check}>¿Está pago?</FieldLabel>
                <select
                  value={pago}
                  onChange={(e) => setPago(e.target.value)}
                  className={`${inputBase} appearance-none`}
                >
                  <option value="" disabled>
                    Elegir
                  </option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <FieldLabel icon={CreditCard}>Medio de pago</FieldLabel>
                <select
                  value={medioDePago}
                  onChange={(e) => setMedioDePago(e.target.value)}
                  className={`${inputBase} appearance-none`}
                >
                  <option value="" disabled>
                    Elegir
                  </option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="varios">Varios</option>
                </select>
              </div>
            </div>
            {esIngreso && medioDePago === "tarjeta" && (
              <p className="text-[11px] text-amber-600">
                Con tarjeta, este monto no sale de la caja ahora: queda registrado como deuda.
              </p>
            )}
          </Card>

          {/* Productos */}
          <div className="sm:col-span-2">
            <Card title="Productos">
              <div className="relative">
                <FieldLabel icon={Search}>Buscar producto</FieldLabel>

                <input
                    type="text"
                    value={busqueda}
                    disabled={!tipoMovimiento}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setProductoSeleccionado(null);
                      setMostrarDropdown(true);
                    }}
                    onFocus={() => {
                      if (tipoMovimiento) {
                        setMostrarDropdown(true);
                      }
                    }}
                    placeholder={
                      tipoMovimiento
                        ? "Escribí el nombre del producto..."
                        : "Primero seleccioná el tipo de movimiento"
                    }
                    className={`${inputBase} ${
                      !tipoMovimiento
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : ""
                    }`}
                  />

                {mostrarDropdown && busqueda.trim() !== "" && !productoSeleccionado && (
                  <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {buscando && (
                      <div className="px-3.5 py-3 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin" />
                        Buscando...
                      </div>
                    )}
                    {!buscando && resultados.length === 0 && (
                      <div className="px-3.5 py-3 text-xs text-slate-400">
                        No se encontraron productos
                      </div>
                    )}
                    {!buscando &&
                      resultados.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => seleccionarProducto(p)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                        >
                          <span className="text-sm text-slate-800 truncate">{p.descripcion}</span>
                          <span className="text-xs font-mono font-semibold text-teal-700 shrink-0">
                            {formatearMoneda(p.precio)}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {!tipoMovimiento && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <span className="text-xs">⚠️</span>
                    </div>

                    <p className="text-[11px] font-medium text-amber-700">
                      Primero seleccioná si el movimiento es un ingreso o un egreso para
                      poder buscar productos.
                    </p>
                  </div>
                )}

              {productoSeleccionado && (
                <div className="flex items-end gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-teal-700 font-medium truncate">
                      {productoSeleccionado.descripcion}
                    </p>
                    <p className="text-[11px] text-teal-600/80 font-mono">
                      {formatearMoneda(productoSeleccionado.precio)} c/u
                    </p>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={cantidadProducto}
                      onChange={(e) => setCantidadProducto(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Cant."
                      className="w-full rounded-lg border border-teal-200 bg-white px-2.5 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={agregarProducto}
                    disabled={!cantidadProducto || parseInt(cantidadProducto, 10) <= 0}
                    className="w-9 h-9 rounded-lg bg-teal-600 disabled:bg-teal-300 text-white flex items-center justify-center shrink-0"
                  >
                    <Plus size={17} />
                  </button>
                </div>
              )}

              {productos.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {productos.map((p) => {
                    const stockResultante =
                      esEgreso && p.stockDisponible !== null
                        ? p.stockDisponible - p.cantidad
                        : null;
                    const hayOverStock = stockResultante !== null && stockResultante < 0;
                    const hayStockBajo =
                      stockResultante !== null && stockResultante >= 0 && stockResultante <= 5;

                    return (
                      <div key={p.uid}>
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                              <Package size={13} className="text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {p.nombre}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {formatearMoneda(p.precio)} c/u
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={1}
                              value={p.cantidad}
                              onChange={(e) =>
                                cambiarCantidad(p.uid, parseInt(e.target.value || "1", 10))
                              }
                              className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                            <span className="text-xs font-mono font-semibold text-slate-700 w-20 text-right">
                              {formatearMoneda(p.cantidad * p.precio)}
                            </span>
                            <button
                              type="button"
                              onClick={() => quitarProducto(p.uid)}
                              className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0"
                            >
                              <X size={12} className="text-slate-500" />
                            </button>
                          </div>
                        </div>

                        {hayOverStock && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1 px-1">
                            Over stock: no hay cantidad suficiente. Vas a quedar con{" "}
                            {stockResultante} unidades (negativo).
                          </p>
                        )}
                        {!hayOverStock && hayStockBajo && (
                          <p className="text-[11px] text-amber-600 font-medium mt-1 px-1">
                            {stockResultante === 0
                              ? "Con esta cantidad se agota el stock de este producto."
                              : `Quedan solo ${stockResultante} unidades disponibles.`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resumen: distinto para ingreso y egreso */}
              {productos.length > 0 && esEgreso && (
                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5">
                  <div>
                    <p className="text-[11px] text-slate-400">Cantidad total</p>
                    <p className="text-sm font-semibold text-white">{cantidadTotalCalculada} u.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Monto total</p>
                    <p className="text-sm font-mono font-semibold text-white">
                      {formatearMoneda(montoListaCalculado)}
                    </p>
                  </div>
                </div>
              )}

              {productos.length > 0 && esIngreso && (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5">
                    <div>
                      <p className="text-[11px] text-slate-400">Cantidad total</p>
                      <p className="text-sm font-semibold text-white">
                        {cantidadTotalCalculada} u.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Total a precio de lista</p>
                      <p className="text-sm font-mono font-semibold text-white">
                        {formatearMoneda(montoListaCalculado)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel icon={Wallet}>Monto total pagado (real)</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        montoTotalIngresoDigits
                          ? formatearMoneda(montoTotalIngresoPagado)
                          : ""
                      }
                      onChange={(e) =>
                        setMontoTotalIngresoDigits(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="$ 0,00"
                      className={`${inputBase} font-mono text-base`}
                    />
                  </div>

                  {montoTotalIngresoDigits && (
                    <div
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 ${
                        diferenciaIngreso > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : diferenciaIngreso < 0
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {diferenciaIngreso > 0 && <TrendingUp size={15} />}
                      {diferenciaIngreso < 0 && <TrendingDown size={15} />}
                      <p className="text-xs font-medium">
                        {diferenciaIngreso > 0 &&
                          `Ganancia estimada: ${formatearMoneda(diferenciaIngreso)}`}
                        {diferenciaIngreso < 0 &&
                          `Pérdida estimada: ${formatearMoneda(Math.abs(diferenciaIngreso))}`}
                        {diferenciaIngreso === 0 && "Pagaste exactamente el precio de lista"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Comprobante */}
          <Card title="Comprobante">
            <div>
              <FieldLabel icon={Paperclip}>Adjuntar comprobante</FieldLabel>

              {esEdicion && movimiento?.nroComprobante && !archivo && (
                <a
                  href={movimiento.nroComprobante}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 mb-2 hover:bg-slate-100 transition-colors"
                >
                  <Paperclip size={15} className="text-slate-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-600 truncate">
                    Ver comprobante actual
                  </span>
                </a>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT}
                onChange={handleFileSelect}
                className="hidden"
                id="comprobante-input"
              />

              {!archivo ? (
                <label
                  htmlFor="comprobante-input"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
                >
                  <Paperclip size={18} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">
                    {esEdicion ? "Reemplazar comprobante" : "Tocá para subir desde la galería"}
                  </span>
                  <span className="text-[11px] text-slate-400">PDF, JPG o PNG</span>
                </label>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={15} className="text-teal-600 shrink-0" />
                    <span className="text-xs font-medium text-teal-800 truncate">
                      {archivo.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0"
                  >
                    <X size={13} className="text-slate-500" />
                  </button>
                </div>
              )}

              {fileError && <p className="text-xs text-rose-600 mt-1.5">{fileError}</p>}
            </div>
          </Card>

       {/* Estado: solo egreso */}
          {esEgreso && (
            <Card title="Estado">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel icon={Receipt}>Factura</FieldLabel>
                  <select
                    value={factura}
                    onChange={(e) => setFactura(e.target.value as "si" | "no")}
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <FieldLabel icon={Truck}>Entregado</FieldLabel>
                  <select
                    value={entregado}
                    onChange={(e) => setEntregado(e.target.value as "si" | "no")}
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* Notas de crédito: solo al crear un egreso */}
          {esEgreso && !esEdicion && (
            <div className="sm:col-span-2">
              <Card title="Notas de crédito (opcional)">
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
                  <FieldLabel icon={Receipt}>Descripción</FieldLabel>
                  <input
                    type="text"
                    value={descripcionCredito}
                    onChange={(e) => setDescripcionCredito(e.target.value)}
                    placeholder="Detalle del pedido no abonado..."
                    className={inputBase}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel icon={Wallet}>Monto total</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        montoTotalCreditoDigits
                          ? formatearMoneda(digitsToNumber(montoTotalCreditoDigits))
                          : ""
                      }
                      onChange={(e) =>
                        setMontoTotalCreditoDigits(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="$ 0,00"
                      className={`${inputBase} font-mono`}
                    />
                  </div>
                  <div>
                    <FieldLabel icon={Wallet}>Monto pagado</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        montoPagoCreditoDigits
                          ? formatearMoneda(digitsToNumber(montoPagoCreditoDigits))
                          : ""
                      }
                      onChange={(e) =>
                        setMontoPagoCreditoDigits(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="$ 0,00"
                      className={`${inputBase} font-mono`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={agregarCredito}
                  disabled={
                    !nombreCliente.trim() ||
                    !descripcionCredito.trim() ||
                    !montoTotalCreditoDigits ||
                    !montoPagoCreditoDigits
                  }
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed text-teal-700 text-sm font-semibold py-2.5"
                >
                  <Plus size={15} />
                  Agregar cliente
                </button>

                {creditos.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {creditos.map((c) => {
                      const montoTotal = digitsToNumber(c.montoTotalDigits);
                      const montoPago = digitsToNumber(c.montoPagoDigits);
                      const pendiente = montoTotal - montoPago;
                      return (
                        <div
                          key={c.uid}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">
                              {c.nombreCliente}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{c.descripcion}</p>
                            <p className="text-[11px] font-mono text-rose-600 mt-0.5">
                              Pendiente: {formatearMoneda(pendiente)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => quitarCredito(c.uid)}
                            className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0"
                          >
                            <X size={12} className="text-slate-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Nota */}
          <div className="sm:col-span-2">
            <Card title="Nota (opcional)">
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Cualquier aclaración adicional..."
                rows={3}
                className={`${inputBase} resize-none`}
              />
            </Card>
          </div>

          {formError && (
            <div className="sm:col-span-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
              <p className="text-xs text-rose-600 font-medium">{formError}</p>
            </div>
          )}
        </form>

        {/* Sticky submit */}
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
              "Guardar movimiento"
            )
            }
          </button>
        </div>
      </div>
      <br />
      <br />
    </div>
  );
}
