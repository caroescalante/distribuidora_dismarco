import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EliminarMovimientoButton } from "@/components/EliminarMovimientoButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [movimientos, total] = await Promise.all([
    prisma.movimientosexternos.findMany({
      orderBy: { id: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.movimientosexternos.count(),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl min-h-screen flex flex-col pb-28 px-0 sm:px-2">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-2">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">{total} en total</p>
            <h1 className="text-lg font-bold text-slate-900">Movimientos externos</h1>
          </div>
        </div>

        {/* Grilla */}
        <div className="px-5 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {movimientos.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <p className="text-sm text-slate-400">Todavía no hay movimientos cargados</p>
            </div>
          )}

          {movimientos.map((m) => {
            const esIngreso = m.tipo_movimiento === "ingreso";
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col"
              >
                <Link href={`/movimientos/edit?id=${m.id}`} className="block px-4 pt-3 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full shrink-0 ${
                        esIngreso
                          ? "bg-teal-100 text-teal-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {esIngreso ? "Ingreso" : "Egreso"}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {formatearFecha(m.fecha_movimiento)}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 mt-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Package size={13} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 min-w-0">
                      {m.descripcion}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-[11px] text-slate-500">Cantidad</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {m.cantidad_total} u.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Total</p>
                      <p className="text-sm font-mono font-semibold text-slate-800">
                        {formatearMoneda(Number(m.monto_total))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        m.pago === "si"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {m.pago === "si" ? "Pago" : "No pago"}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                      {m.medio_de_pago}
                    </span>
                    {m.entregado === "si" && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
                        Entregado
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex justify-end px-4 py-2 border-t border-slate-100 mt-2">
                  <EliminarMovimientoButton id={m.id} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 mt-5">
            <Link
              href={`/movimientos?page=${Math.max(page - 1, 1)}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page <= 1 ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </Link>
            <p className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </p>
            <Link
              href={`/movimientos?page=${Math.min(page + 1, totalPages)}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page >= totalPages ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <ChevronRight size={16} className="text-slate-600" />
            </Link>
          </div>
        )}

        {/* Botón flotante: nuevo movimiento */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm sm:max-w-2xl lg:max-w-4xl">
          <Link
            href="/movimientos/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm sm:w-auto sm:ml-auto sm:px-6"
          >
            <Plus size={16} />
            Nuevo movimiento
          </Link>
        </div>
      </div>
    </div>
  );
}
