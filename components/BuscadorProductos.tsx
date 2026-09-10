"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, X } from "lucide-react";

type ProductoResultado = {
  id: number;
  descripcion: string;
  precio: number;
  stock_disponible: number | null;
};

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function BuscadorProductos() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ProductoResultado[]>([]);
  const [loading, setLoading] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cierra el dropdown al clickear afuera
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  // Búsqueda con debounce, reutilizando /api/productos/search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length === 0) {
      setResultados([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResultados(data.productos ?? []);
      } catch (err) {
        console.error("Error al buscar productos:", err);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const limpiar = useCallback(() => {
    setQuery("");
    setResultados([]);
    setAbierto(false);
  }, []);

  return (
    <div ref={contenedorRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar producto..."
          className="w-full bg-white border border-slate-100 shadow-sm rounded-2xl pl-9 pr-9 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {abierto && query.trim().length > 0 && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-lg max-h-80 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-xs text-slate-400">Buscando...</p>}

          {!loading && resultados.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">
              No se encontraron productos habilitados
            </p>
          )}

          {!loading &&
            resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  limpiar();
                  router.push(`/productos/edit?id=${p.id}`);
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <Package size={13} className="text-slate-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {p.descripcion}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-semibold text-slate-700">
                    {formatearMoneda(p.precio)}
                  </p>
                  <p className="text-[10px] text-slate-400">{p.stock_disponible ?? 0} u.</p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}