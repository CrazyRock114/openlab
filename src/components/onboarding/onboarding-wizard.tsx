"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, GraduationCap, UserRound } from "lucide-react";
import { SUBJECT_AREAS } from "@/lib/content/schema";
import { saveProfile, type LearnerProfile } from "@/lib/db";
import { cn } from "@/lib/utils";

const GRADES = ["初中", "高中", "大学", "成人自学"];

/** 本地学习档案向导（无账号版 onboarding）：3 步，数据只存本机 */
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<LearnerProfile>({ name: "", role: "learner" });

  const toggleSubject = (s: string) => {
    setProfile((p) => {
      const subjects = p.subjects ?? [];
      return { ...p, subjects: subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s] };
    });
  };

  const finish = async () => {
    await saveProfile({ ...profile, name: profile.name.trim() || "同学" });
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          <GraduationCap className="h-3.5 w-3.5" />
          本地学习档案 · 无需注册
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">用 30 秒定制你的课堂</h1>
        {/* 步骤指示 */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {["身份", "称呼", "偏好"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-400"
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("text-xs", i === step ? "font-semibold text-slate-700" : "text-slate-400")}>{label}</span>
              {i < 2 && <span className="h-px w-6 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { role: "learner", icon: BookOpen, title: "我是学习者", desc: "我想学习科学" },
                { role: "educator", icon: UserRound, title: "我是教育者", desc: "我想创建内容并分享" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.role}
                type="button"
                onClick={() => {
                  setProfile((p) => ({ ...p, role: opt.role }));
                  setStep(1);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition",
                  profile.role === opt.role
                    ? "border-brand-500 bg-brand-50/60"
                    : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/30"
                )}
              >
                <opt.icon className="h-8 w-8 text-brand-600" />
                <span className="font-semibold">{opt.title}</span>
                <span className="text-xs text-slate-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="text-sm font-medium text-slate-700">怎么称呼你？</label>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="昵称或姓名"
              autoFocus
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="text-sm text-slate-400 transition hover:text-slate-600">
                ← 上一步
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <span className="text-sm font-medium text-slate-700">你现在的学段</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setProfile((p) => ({ ...p, grade: p.grade === g ? undefined : g }))}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    profile.grade === g
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-300"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <span className="mt-5 block text-sm font-medium text-slate-700">感兴趣的科目（可多选）</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(SUBJECT_AREAS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSubject(key)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    profile.subjects?.includes(key)
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-brand-300"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-400 transition hover:text-slate-600">
                ← 上一步
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                完成设置
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">这些信息只保存在你的浏览器里，用于个性化推荐与作业署名。</p>
    </div>
  );
}
