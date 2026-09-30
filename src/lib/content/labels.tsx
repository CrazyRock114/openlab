import {
  BookOpen,
  FileText,
  FlaskConical,
  ListChecks,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import type { AnyItemType } from "./schema";

/** 内容类型的中文标签与英文副标 */
export const TYPE_LABELS: Partial<Record<AnyItemType, string>> = {
  lx_text: "图文",
  video: "视频",
  assignment: "问题集",
  lx_simulation: "模拟实验",
  interactive: "互动",
  question: "问题",
  case_study: "案例研究",
  narrative: "人物故事",
  teaching_guide: "教学指南",
  audio: "音频",
  image: "图片",
  document: "文档",
  book: "教科书",
};

export const TYPE_EN: Partial<Record<AnyItemType, string>> = {
  lx_text: "TEXT",
  video: "VIDEO",
  assignment: "QUIZ",
  lx_simulation: "SIMULATION",
};

export const TYPE_ICONS: Partial<Record<AnyItemType, LucideIcon>> = {
  lx_text: FileText,
  video: PlayCircle,
  assignment: ListChecks,
  lx_simulation: FlaskConical,
};

export const TYPE_GRADIENTS: Partial<Record<AnyItemType, string>> = {
  lx_text: "from-sky-500 to-indigo-600",
  video: "from-rose-500 to-red-600",
  assignment: "from-amber-500 to-orange-600",
  lx_simulation: "from-emerald-500 to-teal-600",
};

export function typeIcon(type: AnyItemType): LucideIcon {
  return TYPE_ICONS[type] ?? BookOpen;
}

export function typeLabel(type: AnyItemType): string {
  return TYPE_LABELS[type] ?? "资源";
}

export function typeEn(type: AnyItemType): string {
  return TYPE_EN[type] ?? "RESOURCE";
}

export function typeGradient(type: AnyItemType): string {
  return TYPE_GRADIENTS[type] ?? "from-slate-500 to-slate-700";
}

/** 背景知识门槛（LabXchange 差异化筛选维度） */
export const BG_LABELS: Record<string, { label: string; cls: string }> = {
  none: { label: "零基础友好", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  some: { label: "需要一些基础", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  extensive: { label: "需要较深基础", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

export const LICENSE_LABELS: Record<string, string> = {
  lx_standard: "开放内容许可（本站标准）",
  CC_BY_4: "CC BY 4.0（署名）",
  CC_BY_SA_4: "CC BY-SA 4.0（署名-相同方式共享）",
  CC_BY_NC_4: "CC BY-NC 4.0（署名-非商业性）",
  CC_BY_NC_SA_4: "CC BY-NC-SA 4.0（署名-非商业-相同方式共享）",
  PD: "公共领域",
};

export const LICENSE_URLS: Partial<Record<string, string>> = {
  CC_BY_4: "https://creativecommons.org/licenses/by/4.0/deed.zh",
  CC_BY_SA_4: "https://creativecommons.org/licenses/by-sa/4.0/deed.zh",
  CC_BY_NC_4: "https://creativecommons.org/licenses/by-nc/4.0/deed.zh",
  CC_BY_NC_SA_4: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh",
};

export const LANG_LABELS: Record<string, string> = {
  "zh-hans": "中文（简体）",
  en: "English",
};
