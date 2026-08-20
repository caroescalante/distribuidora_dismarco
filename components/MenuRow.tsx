import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

type Tone = "teal" | "emerald" | "amber" | "rose" | "slate";

const chipTones: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export function MenuRow({
  href,
  icon: Icon,
  tone,
  title,
  desc,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  desc: string;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      className="w-full flex items-center gap-3 py-3 text-left group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${chipTones[tone]}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
      {badge ? (
        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      ) : (
        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400" />
      )}
    </Link>
  );
}
