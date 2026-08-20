import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EliminarNotaCreditoButton } from "@/components/EliminarNotaCreditoButton";

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

function formatearFecha(fecha: Date | null) {
  if (!fecha) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export default async function NotasCreditoPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(
    parseInt(searchParams.page ?? "1", 10) || 1,
    1
  );

  const skip = (page - 1) * PAGE_SIZE;

  // Orden DESC por id:
  // las notas de crédito más recientes primero.
  const [creditos, total] = await Promise.all([
    prisma.creditosclientes.findMany({
      orderBy: {
        id: "desc",
      },
      skip,
      take: PAGE_SIZE,
    }),

    prisma.creditosclientes.count(),
  ]);

  const totalPages = Math.max(
    Math.ceil(total / PAGE_SIZE),
    1
  );

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-sm min-h-screen flex flex-col">

        {/* ------------------------------------------------ */}
        {/* TOP BAR */}
        {/* ------------------------------------------------ */}

        <div className="flex items-center gap-3 px-5 pt-6 pb-2 shrink-0">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft
              size={16}
              className="text-slate-600"
            />
          </Link>

          <div>
            <p className="text-xs text-slate-500">
              {total} en total
            </p>

            <h1 className="text-lg font-bold text-slate-900">
              Notas de crédito
            </h1>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* LISTA */}
        {/* ------------------------------------------------ */}

        <div className="px-5 mt-3 flex flex-col gap-2">
          {creditos.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <p className="text-sm text-slate-400">
                Todavía no hay notas de crédito cargadas
              </p>
            </div>
          )}

          {creditos.map((c) => {
            const esPago = c.estado === "pago";

            return (
              <div
                key={c.id}
                className={`rounded-2xl border shadow-sm transition-colors ${
                  esPago
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-rose-50 border-rose-100"
                }`}
              >
                <Link
                  href={`/notas-credito/edit?id=${c.id}`}
                  className="block px-4 pt-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          esPago
                            ? "text-emerald-800"
                            : "text-rose-800"
                        }`}
                      >
                        {c.nombre_cliente || "Sin nombre"}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatearFecha(c.fecha)}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full shrink-0 ${
                        esPago
                          ? "bg-emerald-200/60 text-emerald-800"
                          : "bg-rose-200/60 text-rose-800"
                      }`}
                    >
                      {esPago
                        ? "Pago"
                        : "No pago"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-[11px] text-slate-500">
                        Pendiente
                      </p>

                      <p
                        className={`text-sm font-mono font-semibold ${
                          esPago
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {formatearMoneda(
                          Number(c.monto_pendiente)
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">
                        Total
                      </p>

                      <p className="text-sm font-mono font-semibold text-slate-700">
                        {formatearMoneda(
                          Number(c.monto_total ?? 0)
                        )}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-end px-4 py-2 border-t border-black/5 mt-2">
                  <EliminarNotaCreditoButton
                    id={c.id}
                    nombreCliente={
                      c.nombre_cliente ?? ""
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ------------------------------------------------ */}
        {/* PAGINACIÓN */}
        {/* ------------------------------------------------ */}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 mt-5">
            <Link
              href={`/notas-credito?page=${Math.max(
                page - 1,
                1
              )}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page <= 1
                  ? "opacity-40 pointer-events-none"
                  : ""
              }`}
            >
              <ChevronLeft
                size={16}
                className="text-slate-600"
              />
            </Link>

            <p className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </p>

            <Link
              href={`/notas-credito?page=${Math.min(
                page + 1,
                totalPages
              )}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page >= totalPages
                  ? "opacity-40 pointer-events-none"
                  : ""
              }`}
            >
              <ChevronRight
                size={16}
                className="text-slate-600"
              />
            </Link>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* ESPACIO FINAL */}
        {/* ------------------------------------------------ */}

        <div className="flex-1" />

        {/* ------------------------------------------------ */}
        {/* BOTÓN NUEVA NOTA */}
        {/* ------------------------------------------------ */}

        <div
          className="px-5 pt-5"
          style={{
            paddingBottom:
              "calc(24px + env(safe-area-inset-bottom))",
          }}
        >
          <Link
            href="/notas-credito/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm"
          >
            <Plus size={16} />
            Nueva nota de crédito
          </Link>
        </div>
      </div>
    </div>
  );
}