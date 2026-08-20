"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function EliminarMovimientoButton({ id }: { id: number }) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmado = window.confirm(
      "¿Eliminar este movimiento? Se van a borrar también sus notas de crédito asociadas y no se puede deshacer."
    );
    if (!confirmado) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/movimientos/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo eliminar el movimiento");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ocurrió un error inesperado");
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
      {eliminando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Eliminar
    </button>
  );
}
