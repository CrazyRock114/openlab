"use client";

import { useRef, useState } from "react";
import { Dna, Play, RotateCcw, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 演示模拟实验：凝胶电泳（Gel Electrophoresis）
 * 真实模拟的骨架验证——纯前端交互、无后端状态（与 LabXchange 的模拟实现方式一致）
 */

type Stage = "idle" | "loaded" | "running" | "done";

interface Band {
  label: string;
  /** 最终停留位置（距凝胶顶部 %）——片段越小迁移越远 */
  top: number;
}

const LANES: { name: string; bands: Band[] }[] = [
  {
    name: "Marker",
    bands: [
      { label: "10 kb", top: 16 },
      { label: "6 kb", top: 27 },
      { label: "3 kb", top: 42 },
      { label: "1 kb", top: 62 },
      { label: "0.5 kb", top: 82 },
    ],
  },
  { name: "样本 A", bands: [{ label: "3 kb", top: 43 }, { label: "1 kb", top: 63 }] },
  { name: "样本 B", bands: [{ label: "10 kb", top: 17 }, { label: "0.5 kb", top: 81 }] },
  { name: "样本 C", bands: [{ label: "6 kb", top: 28 }, { label: "1 kb", top: 61 }] },
];

const WELL_TOP = 7;
const laneLeft = (i: number) => 15 + i * 19;

const btnPrimary =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300";

export function GelElectrophoresis() {
  const [stage, setStage] = useState<Stage>("idle");
  const [voltage, setVoltage] = useState(80);
  const timer = useRef<number | null>(null);
  const duration = Math.round(5600 - voltage * 35); // 40V≈4.2s · 120V≈1.4s

  const run = () => {
    setStage("running");
    timer.current = window.setTimeout(() => setStage("done"), duration);
  };
  const reset = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setStage("idle");
  };
  const migrated = stage === "running" || stage === "done";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* 电泳槽 */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 pb-8 pt-9 text-white">
        <span className="absolute left-4 top-2.5 text-[11px] text-slate-400">− 负极（加样孔）</span>
        <span className="absolute bottom-2.5 left-4 text-[11px] text-slate-400">+ 正极（DNA 向正极迁移）</span>
        <div className="relative h-[380px] rounded-xl bg-[#101f3d] ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.05] to-transparent" />

          {/* 加样孔 */}
          {LANES.map((lane, i) => (
            <div key={lane.name} className="absolute" style={{ left: `${laneLeft(i)}%`, top: `${WELL_TOP}%` }}>
              <div className="h-2 w-10 -translate-x-1/2 rounded-sm bg-black/70 ring-1 ring-white/25" />
              <span className="absolute -left-5 top-3 w-20 text-[10px] text-slate-400">{lane.name}</span>
            </div>
          ))}

          {/* DNA 条带 */}
          {stage !== "idle" &&
            LANES.map((lane, i) =>
              lane.bands.map((band) => (
                <div
                  key={`${lane.name}-${band.label}`}
                  className="absolute h-1.5 w-10 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,0.55)]"
                  style={{
                    left: `${laneLeft(i)}%`,
                    top: `${migrated ? band.top : WELL_TOP + 1.5}%`,
                    transition: stage === "running" ? `top ${duration}ms linear` : undefined,
                  }}
                />
              ))
            )}

          {/* Marker 读数（完成后显示） */}
          {stage === "done" &&
            LANES[0].bands.map((b) => (
              <span
                key={b.label}
                className="absolute text-[10px] font-medium text-cyan-200/90"
                style={{ left: `calc(${laneLeft(0)}% + 24px)`, top: `${b.top - 1}%` }}
              >
                {b.label}
              </span>
            ))}
        </div>
      </div>

      {/* 控制面板 */}
      <aside className="space-y-4">
        <div className="rounded-xl border p-4">
          <h4 className="text-sm font-semibold">实验步骤</h4>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-slate-600">
            <li>把 DNA 样本加入凝胶加样孔</li>
            <li>接通电源，观察条带向正极迁移</li>
            <li>对照 Marker 泳道判断片段大小</li>
          </ol>
        </div>

        <div className="rounded-xl border p-4">
          <label htmlFor="voltage" className="text-sm font-semibold">
            电压：{voltage} V
          </label>
          <input
            id="voltage"
            type="range"
            min={40}
            max={120}
            step={10}
            value={voltage}
            disabled={stage !== "idle"}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="mt-2 w-full accent-emerald-600 disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-slate-400">电压越高迁移越快（真实实验中过高会产生拖尾）</p>
        </div>

        <div className="flex gap-2">
          {stage === "idle" && (
            <button type="button" onClick={() => setStage("loaded")} className={btnPrimary}>
              <TestTube className="h-4 w-4" /> 载入样本
            </button>
          )}
          {stage === "loaded" && (
            <button type="button" onClick={run} className={btnPrimary}>
              <Play className="h-4 w-4" /> 开始电泳
            </button>
          )}
          {stage === "running" && (
            <button type="button" disabled className={cn(btnPrimary, "flex-1 opacity-60")}>
              电泳中…（{voltage} V）
            </button>
          )}
          {(stage === "running" || stage === "done") && (
            <button type="button" onClick={reset} className={btnOutline}>
              <RotateCcw className="h-4 w-4" /> 重置
            </button>
          )}
        </div>

        {stage === "loaded" && (
          <p className="text-xs text-slate-400">样本已就位，接通电源开始迁移。</p>
        )}
      </aside>

      {/* 结果解读 */}
      {stage === "done" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 lg:col-span-2">
          <h4 className="flex items-center gap-2 font-semibold text-emerald-800">
            <Dna className="h-4 w-4" /> 结果解读
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-emerald-900/90">
            <li>· DNA 片段越小迁移得越远（越靠近正极）——凝胶像筛子一样按大小分离分子。</li>
            <li>· 样本 B 同时含最大的 10 kb 与最小的 0.5 kb 片段，分别停在最上和最下。</li>
            <li>· 将样本条带位置与 Marker 泳道对照，即可估算未知片段的大小。</li>
          </ul>
        </div>
      )}
    </div>
  );
}
