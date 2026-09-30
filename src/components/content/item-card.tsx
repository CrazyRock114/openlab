import Link from "next/link";
import { Clock, Globe } from "lucide-react";
import type { Item } from "@/lib/content/schema";
import { BG_LABELS, typeLabel } from "@/lib/content/labels";
import { cn } from "@/lib/utils";
import { TypeCover } from "./type-cover";

export function TypeBadge({ type, className }: { type: Item["type"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-black/5",
        className
      )}
    >
      {typeLabel(type)}
    </span>
  );
}

export function BackgroundChip({ level }: { level: Item["backgroundKnowledge"] }) {
  const info = BG_LABELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        info.cls
      )}
    >
      {info.label}
    </span>
  );
}

export function ItemCard({ meta }: { meta: Item }) {
  const bg = BG_LABELS[meta.backgroundKnowledge];
  return (
    <Link
      href={`/library/items/${meta.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
    >
      <div className="relative h-36 overflow-hidden">
        <TypeCover type={meta.type} />
        <TypeBadge type={meta.type} className="absolute left-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700">
          {meta.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{meta.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {meta.durationMinutes} 分钟
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            中文
          </span>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", bg.cls)}>
            {bg.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
