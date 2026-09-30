"use client";

import Dexie, { type Table } from "dexie";

/**
 * 本地学习数据层（M2）：IndexedDB via Dexie
 * - 进度/收藏/笔记：单机本地身份（M4 增加云同步时表结构向上兼容）
 * - 草稿路径：Pathway 编辑器与 Clone-and-Edit Remix 的存储
 * SSR 预渲染期间 getDB() 返回 null，useLiveQuery 侧以默认值兜底。
 */

export interface ProgressRecord {
  itemId: string;
  completed: boolean;
  updatedAt: number;
}

export interface FavoriteRecord {
  itemId: string;
  addedAt: number;
}

export interface NoteRecord {
  itemId: string;
  body: string;
  updatedAt: number;
}

export interface DraftPathwayRecord {
  draftId: string; // cx-pathway-draft:<uuid>
  title: string;
  description: string;
  learningObjectives: string[];
  language: string;
  license: string;
  authorName: string;
  /** 克隆来源（Remix 溯源），自建草稿为空 */
  clonedFrom?: string;
  entries: { itemId: string; educatorNotes?: string }[];
  createdAt: number;
  updatedAt: number;
}

export interface AssignmentItemConfig {
  itemId: string;
  /** 冗余标题：脱离本站内容库时仍可展示 */
  title?: string;
  /** 每题最大尝试次数；null = 不限 */
  maxAttempts: number | null;
  points: number;
}

export interface AssignmentRecord {
  assignmentId: string; // cx-assignment:<uuid>
  /** created = 本机教师创建；imported = 学生导入 */
  role: "created" | "imported";
  title: string;
  teacherName: string;
  description: string;
  dueDate?: string;
  items: AssignmentItemConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface AssignmentProgressRecord {
  assignmentId: string;
  itemId: string;
  attemptsUsed: number;
  score: number;
  totalPoints: number;
  completed: boolean;
  updatedAt: number;
}

export interface LearnerProfile {
  name: string;
  role: "learner" | "educator";
  grade?: string;
  subjects?: string[];
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

class OpenLabDB extends Dexie {
  progress!: Table<ProgressRecord, string>;
  favorites!: Table<FavoriteRecord, string>;
  notes!: Table<NoteRecord, string>;
  drafts!: Table<DraftPathwayRecord, string>;
  assignments!: Table<AssignmentRecord, string>;
  assignmentProgress!: Table<AssignmentProgressRecord, [string, string]>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("openlab");
    this.version(1).stores({
      progress: "itemId, updatedAt",
      favorites: "itemId, addedAt",
      notes: "itemId, updatedAt",
      drafts: "draftId, updatedAt",
    });
    this.version(2).stores({
      assignments: "assignmentId, role, updatedAt",
      assignmentProgress: "[assignmentId+itemId], assignmentId, updatedAt",
      settings: "key",
    });
  }
}

let _db: OpenLabDB | null = null;

export function getDB(): OpenLabDB | null {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") return null;
  if (!_db) _db = new OpenLabDB();
  return _db;
}

/* ---------------- 进度 ---------------- */

export async function setItemCompleted(itemId: string, completed: boolean): Promise<void> {
  const db = getDB();
  if (!db) return;
  await db.progress.put({ itemId, completed, updatedAt: Date.now() });
}

/* ---------------- 收藏 ---------------- */

export async function toggleFavorite(itemId: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  const existing = await db.favorites.get(itemId);
  if (existing) await db.favorites.delete(itemId);
  else await db.favorites.put({ itemId, addedAt: Date.now() });
}

/* ---------------- 草稿路径 ---------------- */

export function newDraftId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16).padStart(12, "0")}`.replace(/^(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4");
  return `cx-pathway-draft:${uuid}`;
}

export function newAssignmentId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16).padStart(12, "0")}`.replace(/^(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4");
  return `cx-assignment:${uuid}`;
}

/* ---------------- 作业进度上报 ---------------- */

export async function reportAssignmentState(
  assignmentId: string,
  itemId: string,
  state: { attemptsUsed: number; score: number; totalPoints: number }
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const existing = await db.assignmentProgress.get([assignmentId, itemId]);
  await db.assignmentProgress.put({
    assignmentId,
    itemId,
    attemptsUsed: Math.max(state.attemptsUsed, existing?.attemptsUsed ?? 0),
    score: Math.max(state.score, existing?.score ?? 0),
    totalPoints: state.totalPoints,
    completed: Boolean(existing?.completed) || (state.totalPoints > 0 && state.score >= state.totalPoints),
    updatedAt: Date.now(),
  });
}

export async function reportAssignmentCompletion(
  assignmentId: string,
  itemId: string,
  completed: boolean
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const existing = await db.assignmentProgress.get([assignmentId, itemId]);
  await db.assignmentProgress.put({
    assignmentId,
    itemId,
    attemptsUsed: existing?.attemptsUsed ?? 0,
    score: existing?.score ?? 0,
    totalPoints: existing?.totalPoints ?? 0,
    completed,
    updatedAt: Date.now(),
  });
}

/* ---------------- 学习档案（本地 onboarding） ---------------- */

export async function getProfile(): Promise<LearnerProfile | null> {
  const db = getDB();
  if (!db) return null;
  const rec = await db.settings.get("profile");
  return (rec?.value as LearnerProfile | undefined) ?? null;
}

export async function saveProfile(profile: LearnerProfile): Promise<void> {
  const db = getDB();
  if (!db) return;
  await db.settings.put({ key: "profile", value: profile });
}

export async function clonePathwayToDraft(
  source: {
    id: string;
    title: string;
    description: string;
    learningObjectives: string[];
    language: string;
    license: string;
    authors: { name: string }[];
    entries: { itemId: string; educatorNotes?: string }[];
  },
  authorName = "本机创作者"
): Promise<string> {
  const db = getDB();
  if (!db) throw new Error("IndexedDB 不可用");
  const now = Date.now();
  const draftId = newDraftId();
  await db.drafts.put({
    draftId,
    title: `${source.title}（副本）`,
    description: source.description,
    learningObjectives: [...source.learningObjectives],
    language: source.language,
    license: source.license,
    authorName,
    clonedFrom: source.id,
    entries: source.entries.map((e) => ({ ...e })),
    createdAt: now,
    updatedAt: now,
  });
  return draftId;
}

/* ---------------- 旧版 localStorage 进度迁移（M0 → M2） ---------------- */

const LEGACY_PREFIX = "cx:progress:";
let migrated = false;

export async function migrateLegacyProgress(): Promise<number> {
  const db = getDB();
  if (!db || migrated || typeof window === "undefined") return 0;
  migrated = true;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(LEGACY_PREFIX)) keys.push(k);
  }
  let count = 0;
  for (const k of keys) {
    const itemId = decodeURIComponent(k.slice(LEGACY_PREFIX.length));
    if (window.localStorage.getItem(k) === "1") {
      const exists = await db.progress.get(itemId);
      if (!exists) {
        await db.progress.put({ itemId, completed: true, updatedAt: Date.now() });
        count++;
      }
    }
    window.localStorage.removeItem(k);
  }
  return count;
}
