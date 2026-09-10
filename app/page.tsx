import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import {
  Home,
  Receipt,
  Wallet,
  Users,
  FileText,
  PiggyBank,
  Package,
  ArrowRight,
  Bell,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { MenuRow } from "@/components/MenuRow";

export const dynamic = "force-dynamic";

function formatMonto(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default async function DashboardPage() {
  // Caja se trata como fila única con los totales vigentes.
  const caja = await prisma.caja.findFirst({
    orderBy: { id: "desc" },
  });

  const clientesConDeuda = await prisma.creditosclientes.count({
    where: { estado: "no_pago" },
  });

  const monto_total = Number(caja?.monto_total ?? 0);
  const montoPerdida = Number(caja?.monto_perdida ?? 0);
  const montoGanancia = Number(caja?.monto_ganancia ?? 0);
  const montoPendientePago = Number(caja?.monto_pendiente_pago ?? 0);
  const montoDeuda = Number(caja?.monto_deuda ?? 0);

  const cajaNegativa = monto_total < 0;

  const fechaHoy = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Ancho fluido en celular (chico o grande), recién se limita a partir de tablet */}
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto min-h-screen flex flex-col pb-28">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0 pt-6 pb-2">
          <div>
            <p className="text-xs sm:text-sm text-slate-500 capitalize">
              {fechaHoy}
            </p>

            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
              Distribuidora Dismarco
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center">
              <Bell size={16} className="text-slate-500" />
            </button>

            <LogoutButton />
          </div>
        </div>

        {/* Hero + Stats */}
        <div className="px-4 sm:px-6 lg:px-0 mt-3 lg:grid lg:grid-cols-5 lg:gap-4 lg:items-stretch">

          {/* Hero total */}
          <div className="lg:col-span-2">
            <Link
              href="/caja"
              className={`h-full flex flex-col justify-center rounded-3xl p-5 lg:p-6 text-white shadow-lg relative overflow-hidden ${
                cajaNegativa
                  ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/10"
                  : "bg-gradient-to-br from-teal-600 to-cyan-700 shadow-teal-900/10"
              }`}
            >
              {/* Decoración */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-white/10" />

              <p
                className={`text-xs sm:text-sm font-medium mb-1 relative ${
                  cajaNegativa
                    ? "text-red-50/80"
                    : "text-teal-50/80"
                }`}
              >
                Monto total en caja
              </p>

              <p className="font-mono text-3xl sm:text-4xl lg:text-3xl xl:text-4xl font-bold tracking-tight relative">
                {formatMonto(monto_total)}
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
                  className={`text-xs sm:text-sm ${
                    cajaNegativa
                      ? "text-red-50/90"
                      : "text-teal-50/90"
                  }`}
                >
                  Ganancia del período {formatMonto(montoGanancia)}
                </span>
              </div>
            </Link>
          </div>

          {/* Stats grid */}
          <div className="mt-4 lg:mt-0 lg:col-span-3 grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              icon={TrendingDown}
              label="Pérdida"
              value={formatMonto(montoPerdida)}
              tone="teal"
            />

            <StatCard
              icon={TrendingUp}
              label="Ganancia"
              value={formatMonto(montoGanancia)}
              tone="emerald"
            />

            <StatCard
              icon={Clock}
              label="Pendiente de pago"
              value={formatMonto(montoPendientePago)}
              tone="amber"
            />

            <StatCard
              icon={Wallet}
              label="Deuda"
              value={formatMonto(montoDeuda)}
              tone="rose"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 sm:px-6 lg:px-0 mt-5">
          <a
            href="/movimientos/nuevo"
            className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl px-5 py-4 lg:py-5 flex items-center justify-between shadow-sm"
          >
            <div className="text-left">
              <p className="text-sm sm:text-base font-semibold">
                Cargar movimientos del día
              </p>

              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Ingresos y egresos de hoy
              </p>
            </div>

            <ArrowRight size={18} />
          </a>
        </div>

        {/* Menu */}
        <div className="px-4 sm:px-6 lg:px-0 mt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Secciones
          </p>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 lg:px-6 divide-y divide-slate-100">
            <MenuRow
              href="/movimientos"
              icon={Receipt}
              tone="teal"
              title="Movimientos externos"
              desc="Historial de ingresos y egresos"
            />

            <MenuRow
              href="/notas-credito"
              icon={Users}
              tone="rose"
              title="Clientes fiado"
              desc="Pagos pendientes por cliente"
              badge={clientesConDeuda || undefined}
            />

            <MenuRow
              href="/notas-credito"
              icon={FileText}
              tone="slate"
              title="Notas de crédito"
              desc="Faltantes de caja y justificación"
            />

            <MenuRow
              href="/caja"
              icon={Wallet}
              tone="emerald"
              title="Caja"
              desc="Detalle de deuda e inversión"
            />

            <MenuRow
              href="/productos"
              icon={Package}
              tone="slate"
              title="Productos"
              desc="Precios, costos y stock"
            />

            <MenuRow
              href="/gastos-personales"
              icon={PiggyBank}
              tone="amber"
              title="Gastos personales"
              desc="Aparte de la operación del negocio"
            />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:max-w-md lg:max-w-lg">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex justify-between px-2">

            <button className="flex flex-col items-center gap-1 px-4 py-2 lg:py-2.5">
              <Home
                size={19}
                strokeWidth={2.2}
                className="text-teal-600"
              />

              <span className="text-[10px] font-medium text-slate-900">
                Inicio
              </span>

              <span className="w-1 h-1 rounded-full bg-teal-600" />
            </button>

            <Link
              href="/movimientos"
              className="flex flex-col items-center gap-1 px-4 py-2 lg:py-2.5"
            >
              <Receipt
                size={19}
                strokeWidth={2.2}
                className="text-slate-400"
              />

              <span className="text-[10px] font-medium text-slate-400">
                Movimientos
              </span>
            </Link>

            <Link
              href="/caja"
              className="flex flex-col items-center gap-1 px-4 py-2 lg:py-2.5"
            >
              <Wallet
                size={19}
                strokeWidth={2.2}
                className="text-slate-400"
              />

              <span className="text-[10px] font-medium text-slate-400">
                Caja
              </span>
            </Link>

            <Link
              href="/productos"
              className="flex flex-col items-center gap-1 px-4 py-2 lg:py-2.5"
            >
              <Package
                size={19}
                strokeWidth={2.2}
                className="text-slate-400"
              />

              <span className="text-[10px] font-medium text-slate-400">
                Productos
              </span>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}