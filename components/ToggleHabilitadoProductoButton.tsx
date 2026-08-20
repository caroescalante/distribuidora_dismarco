"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Loader2 } from "lucide-react";

export function ToggleHabilitadoProductoButton({
  id,
  habilitado,
}: {
  id: number;
  habilitado: "si" | "no";
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setCargando(true);
    try {
      const res = await fetch(`/api/productos/${id}/habilitado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habilitado: habilitado === "si" ? "no" : "si" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo actualizar el producto");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ocurrió un error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={cargando}
      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors"
    >
      {cargando ? (
        <Loader2 size={13} className="animate-spin" />
      ) : habilitado === "si" ? (
        <EyeOff size={13} />
      ) : (
        <Eye size={13} />
      )}
      {habilitado === "si" ? "Deshabilitar" : "Habilitar"}
    </button>
  );
}
