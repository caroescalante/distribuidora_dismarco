import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EliminarProductoButton } from "@/components/EliminarProductoButton";
import { ToggleHabilitadoProductoButton } from "@/components/ToggleHabilitadoProductoButton";

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

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [productos, total] = await Promise.all([
    prisma.productos.findMany({
      orderBy: { descripcion: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.productos.count(),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto min-h-screen flex flex-col pb-28">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-0 pt-6 pb-2">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">{total} productos</p>
            <h1 className="text-lg font-bold text-slate-900">Productos</h1>
          </div>
        </div>

        {/* Grilla */}
        <div className="px-4 sm:px-6 lg:px-0 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {productos.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <p className="text-sm text-slate-400">Todavía no hay productos cargados</p>
            </div>
          )}

          {productos.map((p) => {
            const deshabilitado = p.habilitado === "no";
            return (
              <div
                key={p.id}
                className={`rounded-2xl border shadow-sm flex flex-col ${
                  deshabilitado
                    ? "border-slate-200 bg-slate-50/60"
                    : "border-slate-100 bg-white"
                }`}
              >
                <Link href={`/productos/edit?id=${p.id}`} className="block px-4 pt-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                        <Package size={13} className="text-slate-400" />
                      </div>
                      <p
                        className={`text-sm font-semibold truncate ${
                          deshabilitado ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {p.descripcion}
                      </p>
                    </div>
                    {deshabilitado && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-slate-200 text-slate-600 shrink-0">
                        Deshabilitado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-[11px] text-slate-500">Precio</p>
                      <p className="text-sm font-mono font-semibold text-slate-800">
                        {formatearMoneda(Number(p.precio))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Stock disponible</p>
                      <p
                        className={`text-sm font-mono font-semibold ${
                          (p.stock_disponible ?? 0) < 0
                            ? "text-rose-600"
                            : (p.stock_disponible ?? 0) <= 5
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}
                      >
                        {p.stock_disponible ?? 0} u.
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 mt-2">
                  <ToggleHabilitadoProductoButton id={p.id} habilitado={p.habilitado as "si" | "no"} />
                  <EliminarProductoButton id={p.id} descripcion={p.descripcion} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0 mt-5">
            <Link
              href={`/productos?page=${Math.max(page - 1, 1)}`}
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
              href={`/productos?page=${Math.min(page + 1, totalPages)}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page >= totalPages ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <ChevronRight size={16} className="text-slate-600" />
            </Link>
          </div>
        )}

        {/* Botón flotante: nuevo producto */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:max-w-2xl lg:max-w-4xl">
          <Link
            href="/productos/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm sm:w-auto sm:ml-auto sm:px-6"
          >
            <Plus size={16} />
            Nuevo producto
          </Link>
        </div>
      </div>
    </div>
  );
}
