"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

/** 筛选面板分区（LabXchange「Refine by」样式，每项带聚合计数） */
export function FacetSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <section className="border-b border-slate-100 py-4 last:border-0">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</h3>
      <ul className="mt-2.5 space-y-0.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                  active ? "bg-brand-50 font-medium text-brand-800" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                    active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
                  )}
                >
                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
                <span className="text-xs tabular-nums text-slate-400">{o.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
