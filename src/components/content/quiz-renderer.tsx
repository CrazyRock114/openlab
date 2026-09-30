"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, ClipboardList, ListChecks, RotateCcw, X, XCircle } from "lucide-react";
import type { Quiz } from "@/lib/content/schema";
import { setItemCompleted } from "@/lib/db";
import { useAssignmentMode } from "@/components/assignments/assignment-mode";
import { cn } from "@/lib/utils";

interface QuestionState {
  selected: string | null;
  checked: boolean;
  correct: boolean;
  attempts: number;
}

const INITIAL: QuestionState = { selected: null, checked: false, correct: false, attempts: 0 };

/**
 * 问题集渲染器：公共库模式（无限重试、答错给澄清反馈）
 * maxAttempts 非 null 时限制每题尝试次数（对应教师布置的正式测评）
 */
export function QuizRenderer({
  itemId,
  quiz,
  maxAttempts,
}: {
  itemId: string;
  quiz: Quiz;
  maxAttempts: number | null;
}) {
  const [states, setStates] = useState<Record<string, QuestionState>>({});
  const [toast, setToast] = useState(false);
  const assignment = useAssignmentMode();
  /** 作业模式下限次来自布置配置；公共库模式来自条目自身设置（默认不限） */
  const limit = assignment.active ? assignment.maxAttempts : maxAttempts;

  const stateOf = (id: string): QuestionState => states[id] ?? INITIAL;
  const answeredCount = quiz.questions.filter((q) => stateOf(q.id).checked).length;
  const correctCount = quiz.questions.filter((q) => stateOf(q.id).correct).length;
  const score = quiz.questions.reduce((sum, q) => sum + (stateOf(q.id).correct ? q.points : 0), 0);
  const totalPoints = useMemo(() => quiz.questions.reduce((s, q) => s + q.points, 0), [quiz]);
  const attemptsUsed = quiz.questions.reduce((m, q) => Math.max(m, stateOf(q.id).attempts), 0);

  /* 作业模式：每次作答后上报最新得分与尝试次数 */
  useEffect(() => {
    if (!assignment.active) return;
    assignment.reportState({ attemptsUsed, score, totalPoints });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, assignment.active]);

  const update = (qid: string, patch: Partial<QuestionState>) =>
    setStates((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? INITIAL), ...patch } }));

  const finish = () => {
    void setItemCompleted(itemId, true);
    if (assignment.active) assignment.reportCompletion(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-slate-50 px-5 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4.5 w-4.5 text-amber-600" />
          {quiz.title}
        </span>
        {assignment.active && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            <ClipboardList className="h-3 w-3" />
            作业进行中
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">
          已作答 {answeredCount}/{quiz.questions.length} · 得分 {score}/{totalPoints}
        </span>
      </header>

      <ol className="divide-y divide-slate-100">
        {quiz.questions.map((q, qi) => {
          const s = stateOf(q.id);
          const locked = s.checked && s.correct;
          const limitReached = limit !== null && s.attempts >= limit;
          return (
            <li key={q.id} className="p-5 sm:px-6">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {qi + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-relaxed">
                    {q.stem}
                    <span className="ml-1.5 text-xs font-normal text-slate-400">（{q.points} 分）</span>
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.choices.map((c) => {
                      const isAnswer = s.checked && c.key === q.answer;
                      const isWrongPick = s.checked && s.selected === c.key && c.key !== q.answer;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          disabled={locked}
                          onClick={() => update(q.id, { selected: c.key })}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                            isAnswer && "border-emerald-500 bg-emerald-50 font-medium text-emerald-900",
                            isWrongPick && "border-rose-400 bg-rose-50 text-rose-900",
                            !s.checked &&
                              s.selected === c.key &&
                              "border-brand-500 bg-brand-50 ring-1 ring-brand-500",
                            !s.checked &&
                              s.selected !== c.key &&
                              "border-slate-200 hover:border-brand-300 hover:bg-brand-50/40",
                            s.checked && !isAnswer && !isWrongPick && "border-slate-100 opacity-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                              isAnswer
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : isWrongPick
                                  ? "border-rose-400 bg-rose-400 text-white"
                                  : "border-slate-300 text-slate-500"
                            )}
                          >
                            {c.key}
                          </span>
                          <span className="flex-1">{c.text}</span>
                          {isAnswer && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                          {isWrongPick && <X className="h-4 w-4 shrink-0 text-rose-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {s.checked && (
                    <div
                      className={cn(
                        "mt-3 rounded-xl p-3.5 text-sm",
                        s.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        {s.correct ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {s.correct ? "回答正确！" : "再想想～"}
                      </span>
                      {q.explanation && (
                        <p className="mt-1.5 leading-relaxed opacity-90">{q.explanation}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2.5">
                    {!locked && s.selected && !limitReached && (
                      <button
                        type="button"
                        onClick={() => {
                          update(q.id, {
                            checked: true,
                            correct: s.selected === q.answer,
                            attempts: s.attempts + 1,
                          });
                        }}
                        className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                      >
                        检查答案
                      </button>
                    )}
                    {s.checked && !s.correct && !limitReached && (
                      <button
                        type="button"
                        onClick={() => update(q.id, { selected: null, checked: false, correct: false })}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        再试一次
                      </button>
                    )}
                    {limitReached && (
                      <p className="text-xs text-rose-500">已达最大尝试次数（{limit}）</p>
                    )}
                    {limit === null && s.attempts > 0 && !locked && (
                      <p className="text-xs text-slate-400">第 {s.attempts + 1} 次尝试</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center gap-3 border-t bg-slate-50 px-5 py-4">
        <span className="text-sm text-slate-500">
          答对 {correctCount}/{quiz.questions.length} 题 · 得分 {score}/{totalPoints}
          {limit === null && <span className="ml-2 text-xs text-slate-400">（公共资源 · 无限重试）</span>}
        </span>
        <div className="relative ml-auto flex items-center gap-2.5">
          {toast && (
            <span className="absolute -top-9 right-0 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              ✓ 已记录学习进度（本地）
            </span>
          )}
          <button
            type="button"
            onClick={() => setStates({})}
            className="rounded-lg border px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300"
          >
            重新开始
          </button>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            标记完成
          </button>
        </div>
      </footer>
    </div>
  );
}
