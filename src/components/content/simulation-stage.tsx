"use client";

import { FlaskConical, Wrench } from "lucide-react";
import { GelElectrophoresis } from "./sims/gel-electrophoresis";

/** 模拟实验注册表：新模拟实验在此注册 key → 组件（对应 LabXchange 的 sim XBlock） */
const REGISTRY: Record<string, React.ComponentType> = {
  "gel-electrophoresis": GelElectrophoresis,
};

export function SimulationStage({ simKey, title }: { simKey: string; title: string }) {
  const Sim = REGISTRY[simKey];
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-5 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="h-4.5 w-4.5 text-emerald-600" />
          {title}
        </span>
        <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          虚拟实验 · 试错零成本
        </span>
      </div>
      <div className="p-4 sm:p-6">
        {Sim ? (
          <Sim />
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-slate-400">
            <Wrench className="h-10 w-10" />
            <p className="mt-3 text-sm">模拟「{simKey}」尚未注册渲染组件</p>
            <p className="mt-1 text-xs">在 simulation-stage.tsx 的 REGISTRY 中注册即可</p>
          </div>
        )}
      </div>
    </div>
  );
}
