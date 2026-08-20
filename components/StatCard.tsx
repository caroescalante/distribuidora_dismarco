import { LucideIcon } from "lucide-react";

type Tone = "teal" | "emerald" | "amber" | "rose";

const chipTones: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

const valueTones: Record<Tone, string> = {
  teal: "text-slate-900",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${chipTones[tone]}`}>
        <Icon size={17} strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
        <p className={`font-mono font-semibold text-lg tracking-tight ${valueTones[tone]}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
