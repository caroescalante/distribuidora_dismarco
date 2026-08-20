import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EliminarGastoPersonalButton } from "../../components/EliminarGastoPersonalButton";

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

export default async function GastosPersonalesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(
    parseInt(searchParams.page ?? "1", 10) || 1,
    1
  );

  const skip = (page - 1) * PAGE_SIZE;

  // ---------------------------------------------------------
  // DATOS
  // ---------------------------------------------------------

  const [gastos, total, sumaGastosPersonales] =
    await Promise.all([
      prisma.gastospersonales.findMany({
        orderBy: {
          id: "desc",
        },
        skip,
        take: PAGE_SIZE,
      }),

      prisma.gastospersonales.count(),

      prisma.gastospersonales.aggregate({
        _sum: {
          monto: true,
        },
      }),
    ]);

  // Suma de TODOS los gastos personales.
  // No depende de la página actual.
  const totalGastosPersonales = Number(
    sumaGastosPersonales._sum.monto ?? 0
  );

  const totalPages = Math.max(
    Math.ceil(total / PAGE_SIZE),
    1
  );

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-sm min-h-screen flex flex-col pb-28">

        {/* ------------------------------------------------- */}
        {/* TOP BAR */}
        {/* ------------------------------------------------- */}

        <div className="flex items-start gap-3 px-5 pt-6 pb-2">

          {/* Volver */}
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft
              size={16}
              className="text-slate-600"
            />
          </Link>

          {/* Título + total */}
          <div className="min-w-0">

            <h1 className="text-lg font-bold text-slate-900">
              Gastos Personales
            </h1>

            {/* Total debajo del título */}
            <p className="text-sm font-semibold text-slate-700 mt-1">
              Total:{" "}
              <span className="font-mono">
                {formatearMoneda(totalGastosPersonales)}
              </span>
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              {total} {total === 1 ? "gasto registrado" : "gastos registrados"}
            </p>

          </div>
        </div>

        {/* ------------------------------------------------- */}
        {/* GRILLA */}
        {/* ------------------------------------------------- */}

        <div className="px-5 mt-3">

          {gastos.length === 0 ? (

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">

              <p className="text-sm text-slate-400">
                Todavía no hay gastos personales registrados
              </p>

            </div>

          ) : (

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {gastos.map((g, index) => (

                <div
                  key={g.id}
                  className={`px-4 py-3 ${
                    index !== gastos.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >

                  {/* Descripción + monto */}

                  <Link
                    href={`/gastos-personales/edit?id=${g.id}`}
                    className="flex items-center justify-between gap-3"
                  >

                    <p className="text-sm font-medium text-slate-800 truncate min-w-0 capitalize">
                      {g.descripcion}
                    </p>

                    <p className="text-sm font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {formatearMoneda(Number(g.monto))}
                    </p>

                  </Link>

                  {/* Eliminar */}

                  <div className="flex justify-end mt-1">
                    <EliminarGastoPersonalButton
                      id={g.id}
                      descripcion={g.descripcion}
                    />
                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* ------------------------------------------------- */}
        {/* PAGINACIÓN */}
        {/* ------------------------------------------------- */}

        {totalPages > 1 && (

          <div className="flex items-center justify-between px-5 mt-5">

            <Link
              href={`/gastos-personales?page=${Math.max(
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
              href={`/gastos-personales?page=${Math.min(
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

        {/* ------------------------------------------------- */}
        {/* BOTÓN FLOTANTE */}
        {/* ------------------------------------------------- */}

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm">

          <Link
            href="/gastos-personales/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm"
          >
            <Plus size={16} />
            Nuevo gasto personal
          </Link>

        </div>

      </div>
    </div>
  );
}