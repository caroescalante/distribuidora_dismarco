"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function EliminarGastoPersonalButton({
  id,
  descripcion,
}: {
  id: number;
  descripcion: string;
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmado = window.confirm(
      `¿Está seguro de Eliminar el gasto? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminando(true);

    try {
      const res = await fetch(`/api/gastos-personales/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);

        throw new Error(
          data?.error ?? "No se pudo eliminar el gasto personal"
        );
      }

      router.refresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado"
      );

      setEliminando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={eliminando}
      className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 transition-colors"
    >
      {eliminando ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Trash2 size={13} />
      )}

      {eliminando ? "Eliminando..." : "Eliminar"}
    </button>
  );
}