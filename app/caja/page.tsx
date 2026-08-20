import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Landmark,
  Receipt,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EliminarImpactoCajaButton } from "@/components/EliminarImpactoCajaButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ZONA_HORARIA =
  "America/Argentina/Buenos_Aires";

const ETIQUETAS_TIPO: Record<
  string,
  string
> = {
  ganancia: "Ganancia",
  perdida: "Pérdida",
  inversion: "Inversión",
  deuda: "Pago deuda",
  movimiento_externo:
    "Movimiento externo",
  creditos_clientes:
    "Nota de crédito",
};

const TIPOS_BORRABLES = [
  "ganancia",
  "perdida",
  "deuda",
];

function formatearMoneda(
  valor: number
) {
  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(valor);
}

/**
 * PostgreSQL tiene esta columna como:
 *
 * fecha DateTime? @db.Date
 *
 * Es decir:
 *
 * DATE
 *
 * Recuperamos exclusivamente:
 *
 * YYYY-MM-DD
 *
 * sin convertir timezone.
 */
function obtenerSoloFecha(
  fecha: Date | null
) {
  if (!fecha) return null;

  const año =
    fecha.getUTCFullYear();

  const mes = String(
    fecha.getUTCMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    fecha.getUTCDate()
  ).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

/**
 * Devuelve la fecha actual de Argentina:
 *
 * YYYY-MM-DD
 */
function obtenerFechaHoy() {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          ZONA_HORARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const año =
    partes.find(
      (parte) =>
        parte.type === "year"
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month"
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day"
    )?.value;

  return `${año}-${mes}-${dia}`;
}

/**
 * Compara exclusivamente DATE.
 *
 * No compara hora.
 */
function esMismoDia(
  fecha: Date | null
) {
  if (!fecha) return false;

  const fechaRegistro =
    obtenerSoloFecha(fecha);

  const fechaHoy =
    obtenerFechaHoy();

  return (
    fechaRegistro ===
    fechaHoy
  );
}

/**
 * Muestra:
 *
 * DATE 2026-08-19
 *
 * como:
 *
 * 19/08/2026
 */
function formatearFecha(
  fecha: Date | null
) {
  if (!fecha) {
    return "Sin fecha";
  }

  const año =
    fecha.getUTCFullYear();

  const mes = String(
    fecha.getUTCMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    fecha.getUTCDate()
  ).padStart(2, "0");

  return `${dia}/${mes}/${año}`;
}

export default async function CajaPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
  };
}) {
  const page = Math.max(
    parseInt(
      searchParams.page ?? "1",
      10
    ) || 1,
    1
  );

  const skip =
    (page - 1) *
    PAGE_SIZE;

  const [
    registros,
    total,
    ultimoRegistro,
  ] = await Promise.all([
    prisma.caja.findMany({
      orderBy: {
        id: "desc",
      },
      skip,
      take: PAGE_SIZE,
    }),

    prisma.caja.count(),

    prisma.caja.findFirst({
      orderBy: {
        id: "desc",
      },
    }),
  ]);

  // ---------------------------------------------------------
  // MOVIMIENTOS EXTERNOS QUE TODAVÍA EXISTEN
  // ---------------------------------------------------------

  const referenciasMovimiento =
    [
      ...new Set(
        registros
          .filter(
            (r) =>
              r.tipo_impacto ===
                "movimiento_externo" &&
              r.referencia_id !==
                null
          )
          .map(
            (r) =>
              r.referencia_id!
          )
      ),
    ];

  const movimientosExistentes =
    referenciasMovimiento.length >
    0
      ? await prisma.movimientosexternos.findMany(
          {
            where: {
              id: {
                in: referenciasMovimiento,
              },
            },
            select: {
              id: true,
            },
          }
        )
      : [];

  const idsMovimientosExistentes =
    new Set(
      movimientosExistentes.map(
        (movimiento) =>
          movimiento.id
      )
    );

  const totalPages = Math.max(
    Math.ceil(
      total / PAGE_SIZE
    ),
    1
  );

  // ---------------------------------------------------------
  // ESTADO DE LA CAJA
  // ---------------------------------------------------------

  const montoTotalVigente = Number(
    ultimoRegistro?.monto_total ?? 0
  );

  const cajaNegativa =
    montoTotalVigente < 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto min-h-screen flex flex-col pb-28">

        {/* ------------------------------------------------ */}
        {/* TOP BAR */}
        {/* ------------------------------------------------ */}

        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-0 pt-6 pb-2">
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
              {total} registros
            </p>

            <h1 className="text-lg font-bold text-slate-900">
              Caja
            </h1>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* TOTAL VIGENTE */}
        {/* ------------------------------------------------ */}

        <div className="px-4 sm:px-6 lg:px-0 mt-3">
          <div
            className={`rounded-3xl p-5 text-white shadow-lg relative overflow-hidden ${
              cajaNegativa
                ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/10"
                : "bg-gradient-to-br from-teal-600 to-cyan-700 shadow-teal-900/10"
            }`}
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />

            <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-white/10" />

            <p
              className={`text-xs font-medium mb-1 relative ${
                cajaNegativa
                  ? "text-red-50/80"
                  : "text-teal-50/80"
              }`}
            >
              Monto total vigente
            </p>

            <p className="font-mono text-3xl font-bold tracking-tight relative">
              {formatearMoneda(
                montoTotalVigente
              )}
            </p>

            <div className="flex items-center gap-1.5 mt-2 relative">
              {cajaNegativa ? (
                <TrendingDown
                  size={14}
                  className="text-red-100"
                />
              ) : (
                <TrendingUp
                  size={14}
                  className="text-teal-100"
                />
              )}

              <span
                className={`text-xs ${
                  cajaNegativa
                    ? "text-red-50/90"
                    : "text-teal-50/90"
                }`}
              >
                {cajaNegativa
                  ? "Caja en negativo"
                  : "Caja disponible"}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* RESUMEN */}
        {/* ------------------------------------------------ */}

        <div className="px-4 sm:px-6 lg:px-0 mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Resumen
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

            {/* Ganancia */}

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp
                  size={13}
                  className="text-emerald-600 shrink-0"
                />

                <p className="text-[11px] text-slate-500">
                  Ganancia acumulada
                </p>
              </div>

              <p className="text-sm font-mono font-semibold text-emerald-700">
                {formatearMoneda(
                  Number(
                    ultimoRegistro?.monto_ganancia ??
                      0
                  )
                )}
              </p>
            </div>

            {/* Pérdida */}

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown
                  size={13}
                  className="text-rose-600 shrink-0"
                />

                <p className="text-[11px] text-slate-500">
                  Pérdida acumulada
                </p>
              </div>

              <p className="text-sm font-mono font-semibold text-rose-700">
                {formatearMoneda(
                  Number(
                    ultimoRegistro?.monto_perdida ??
                      0
                  )
                )}
              </p>
            </div>

            {/* Deuda */}

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Landmark
                  size={13}
                  className="text-slate-600 shrink-0"
                />

                <p className="text-[11px] text-slate-500">
                  Deuda pendiente
                </p>
              </div>

              <p className="text-sm font-mono font-semibold text-slate-800">
                {formatearMoneda(
                  Number(
                    ultimoRegistro?.monto_deuda ??
                      0
                  )
                )}
              </p>
            </div>

            {/* NC */}

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Receipt
                  size={13}
                  className="text-slate-600 shrink-0"
                />

                <p className="text-[11px] text-slate-500">
                  Pendiente de pago (NC)
                </p>
              </div>

              <p className="text-sm font-mono font-semibold text-slate-800">
                {formatearMoneda(
                  Number(
                    ultimoRegistro?.monto_pendiente_pago ??
                      0
                  )
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* HISTORIAL */}
        {/* ------------------------------------------------ */}

        <div className="px-4 sm:px-6 lg:px-0 mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Historial
          </p>

          <div className="flex flex-col gap-2">

            {registros.length ===
              0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                <p className="text-sm text-slate-400">
                  Todavía no hay registros de caja
                </p>
              </div>
            )}

            {registros.map(
              (r) => {
                const esManual =
                  TIPOS_BORRABLES.includes(
                    r.tipo_impacto
                  );

                const esGanancia =
                  r.tipo_impacto ===
                  "ganancia";

                const esPerdida =
                  r.tipo_impacto ===
                  "perdida";

                const esDeuda =
                  r.tipo_impacto ===
                  "deuda";

                // -------------------------------------------------
                // MOVIMIENTO EXTERNO ELIMINADO
                // -------------------------------------------------

                const esMovimientoExterno =
                  r.tipo_impacto ===
                  "movimiento_externo";

                const movimientoExternoEliminado =
                  esMovimientoExterno &&
                  r.referencia_id !==
                    null &&
                  !idsMovimientosExistentes.has(
                    r.referencia_id
                  );

                // -------------------------------------------------
                // BORRABLE
                // -------------------------------------------------

                const esBorrable =
                  TIPOS_BORRABLES.includes(
                    r.tipo_impacto
                  ) &&
                  esMismoDia(
                    r.fecha
                  );

                // -------------------------------------------------
                // LINK
                // -------------------------------------------------

                let linkDestino:
                  | string
                  | null = null;

                if (
                  esMovimientoExterno
                ) {
                  if (
                    !movimientoExternoEliminado &&
                    r.referencia_id
                  ) {
                    linkDestino =
                      `/movimientos/edit?id=${r.referencia_id}`;
                  }
                } else if (
                  r.tipo_impacto ===
                    "creditos_clientes" &&
                  r.referencia_id
                ) {
                  linkDestino =
                    `/notas-credito/edit?id=${r.referencia_id}`;
                } else {
                  linkDestino =
                    `/caja/${r.id}`;
                }

                // -------------------------------------------------
                // CONTENIDO
                // -------------------------------------------------

                const contenido = (
                  <>
                    {/* Tipo + fecha */}

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full shrink-0 ${
                          movimientoExternoEliminado
                            ? "bg-rose-100 text-rose-700"
                            : esGanancia
                            ? "bg-emerald-100 text-emerald-700"
                            : esPerdida
                            ? "bg-rose-100 text-rose-700"
                            : esDeuda
                            ? "bg-slate-200 text-slate-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {movimientoExternoEliminado
                          ? "Movimiento Externo Eliminado"
                          : ETIQUETAS_TIPO[
                              r.tipo_impacto
                            ] ??
                            r.tipo_impacto}
                      </span>

                      <p className="text-[11px] text-slate-500">
                        {formatearFecha(
                          r.fecha
                        )}
                      </p>
                    </div>

                    {/* Valores */}

                    <div className="flex items-center justify-between mt-2 gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500">
                          {esDeuda
                            ? "Deuda pendiente"
                            : "Monto total"}
                        </p>

                        <p className="text-sm font-mono font-semibold text-slate-800">
                          {formatearMoneda(
                            Number(
                              esDeuda
                                ? r.monto_deuda
                                : r.monto_total
                            )
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">
                          Monto del Movimiento
                        </p>

                        <p
                          className={`text-sm font-mono font-semibold ${
                            Number(
                              r.monto_movimiento
                            ) > 0
                              ? "text-emerald-700"
                              : Number(
                                  r.monto_movimiento
                                ) < 0
                              ? "text-rose-700"
                              : "text-slate-700"
                          }`}
                        >
                          {formatearMoneda(
                            Number(
                              r.monto_movimiento
                            )
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Nota */}

                    {r.nota && (
                      <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        {r.nota}
                      </p>
                    )}

                    {/* Mensaje para movimiento eliminado */}

                    {movimientoExternoEliminado && (
                      <div className="mt-2 pt-2 border-t border-rose-100">
                        <p className="text-[11px] text-rose-600">
                          Este movimiento ya fue eliminado y no se puede editar.
                        </p>
                      </div>
                    )}
                  </>
                );

                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border bg-white shadow-sm px-4 py-3 ${
                      movimientoExternoEliminado
                        ? "border-rose-100"
                        : "border-slate-100"
                    }`}
                  >
                    {linkDestino ? (
                      <Link
                        href={
                          linkDestino
                        }
                        className="block -m-0.5 p-0.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div>
                        {contenido}
                      </div>
                    )}

                    {/* ELIMINAR IMPACTO MANUAL */}

                    {esBorrable && (
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                        <EliminarImpactoCajaButton
                          id={r.id}
                        />
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* PAGINACIÓN */}
        {/* ------------------------------------------------ */}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0 mt-5">
            <Link
              href={`/caja?page=${Math.max(
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
              Página {page} de{" "}
              {totalPages}
            </p>

            <Link
              href={`/caja?page=${Math.min(
                page + 1,
                totalPages
              )}`}
              className={`w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center ${
                page >=
                totalPages
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
        {/* NUEVO REGISTRO */}
        {/* ------------------------------------------------ */}

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:max-w-2xl lg:max-w-4xl">
          <Link
            href="/caja/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-2 shadow-lg font-semibold text-sm sm:w-auto sm:ml-auto sm:px-6"
          >
            <Plus size={16} />
            Nuevo registro
          </Link>
        </div>
      </div>
    </div>
  );
}