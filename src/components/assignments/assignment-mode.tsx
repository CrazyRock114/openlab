"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CalendarClock, ClipboardList } from "lucide-react";
import { getDB, reportAssignmentCompletion, reportAssignmentState, type AssignmentRecord } from "@/lib/db";

interface AssignmentModeValue {
  active: boolean;
  assignmentId?: string;
  title?: string;
  dueDate?: string;
  /** 当前资源在作业中的每题限次 */
  maxAttempts: number | null;
  points: number;
  reportState: (s: { attemptsUsed: number; score: number; totalPoints: number }) => void;
  reportCompletion: (completed: boolean) => void;
}

const noop = () => {};
const Inactive: AssignmentModeValue = {
  active: false,
  maxAttempts: null,
  points: 0,
  reportState: noop,
  reportCompletion: noop,
};

const Ctx = createContext<AssignmentModeValue>(Inactive);

/**
 * 作业模式上下文：详情页 URL 带 ?a=<assignmentId> 时激活。
 * QuizRenderer 据此限次并上报得分，CompleteButton 据此上报完成。
 */
export function AssignmentModeProvider({ itemId, children }: { itemId: string; children: ReactNode }) {
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null);

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("a");
    if (!a) return;
    void getDB()
      ?.assignments.get(a)
      .then((rec) => {
        if (rec) setAssignment(rec);
      });
  }, []);

  const itemCfg = assignment?.items.find((i) => i.itemId === itemId);
  const active = Boolean(assignment && itemCfg);

  const value: AssignmentModeValue = {
    active,
    assignmentId: assignment?.assignmentId,
    title: assignment?.title,
    dueDate: assignment?.dueDate,
    maxAttempts: itemCfg?.maxAttempts ?? null,
    points: itemCfg?.points ?? 0,
    reportState: (s) => {
      if (!active || !assignment || !itemCfg) return;
      // 测验内部题目分 → 折算到作业为该项设定的分值
      const scaled =
        s.totalPoints > 0 ? Math.round((s.score / s.totalPoints) * itemCfg.points) : s.score;
      void reportAssignmentState(assignment.assignmentId, itemId, {
        attemptsUsed: s.attemptsUsed,
        score: scaled,
        totalPoints: itemCfg.points,
      });
    },
    reportCompletion: (completed) => {
      if (active && assignment) void reportAssignmentCompletion(assignment.assignmentId, itemId, completed);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssignmentMode(): AssignmentModeValue {
  return useContext(Ctx);
}

/** 作业模式横幅：详情页顶部提示当前在完成哪份作业 */
export function AssignmentBanner() {
  const ctx = useAssignmentMode();
  if (!ctx.active) return null;
  const overdue = ctx.dueDate ? new Date(ctx.dueDate) < new Date(new Date().toDateString()) : false;
  return (
    <div
      className={`mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl px-4 py-3 text-sm ring-1 ${
        overdue ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-indigo-50 text-indigo-900 ring-indigo-200"
      }`}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <ClipboardList className="h-4 w-4" />
        作业模式：{ctx.title}
      </span>
      {ctx.dueDate && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" />
          截止 {ctx.dueDate}
          {overdue && "（已逾期）"}
        </span>
      )}
      <span className="ml-auto text-xs opacity-75">本项 {ctx.points} 分 · 每题{ctx.maxAttempts ? `限 ${ctx.maxAttempts} 次` : "不限次"}</span>
    </div>
  );
}
