"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function handleLogout() {
    setSaliendo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={saliendo}
      title="Cerrar sesión"
      className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50"
    >
      {saliendo ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
    </button>
  );
}
