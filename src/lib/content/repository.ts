import fs from "node:fs";
import path from "node:path";
import type { ZodType, ZodTypeDef } from "zod";
import {
  ClusterSchema,
  HomeSchema,
  ItemSchema,
  PathwaySchema,
  QuizSchema,
  type Cluster,
  type HomeContent,
  type Item,
  type Pathway,
  type Quiz,
} from "./schema";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export interface LoadedItem {
  meta: Item;
  /** item.json 所在目录（用于读取正文/题库等 payload 文件） */
  dir: string;
}

interface ContentCache {
  items: LoadedItem[];
  pathways: Pathway[];
  clusters: Cluster[];
  home: HomeContent;
}

function readJson<T>(filePath: string, schema: ZodType<T, ZodTypeDef, unknown>, what: string): T {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(`无法读取${what} ${path.relative(process.cwd(), filePath)}：${(err as Error).message}`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`${what}校验失败 ${path.relative(process.cwd(), filePath)}：\n${issues}`);
  }
  return result.data;
}

function listJsonDir<T>(dir: string, schema: ZodType<T, ZodTypeDef, unknown>, what: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson<T>(path.join(dir, f), schema, what));
}

let cache: ContentCache | null = null;

function loadAll(): ContentCache {
  if (cache) return cache;

  const items: LoadedItem[] = [];
  const itemsRoot = path.join(CONTENT_ROOT, "items");
  if (fs.existsSync(itemsRoot)) {
    for (const org of fs.readdirSync(itemsRoot)) {
      const orgDir = path.join(itemsRoot, org);
      if (!fs.statSync(orgDir).isDirectory()) continue;
      for (const entry of fs.readdirSync(orgDir)) {
        const itemDir = path.join(orgDir, entry);
        const metaPath = path.join(itemDir, "item.json");
        if (!fs.existsSync(metaPath)) continue;
        items.push({ meta: readJson<Item>(metaPath, ItemSchema, "内容条目"), dir: itemDir });
      }
    }
  }

  const pathways = listJsonDir<Pathway>(path.join(CONTENT_ROOT, "pathways"), PathwaySchema, "学习路径");
  const clusters = listJsonDir<Cluster>(path.join(CONTENT_ROOT, "clusters"), ClusterSchema, "群集");
  const home = readJson<HomeContent>(path.join(CONTENT_ROOT, "home.json"), HomeSchema, "首页配置");

  // 引用完整性：路径/群集/首页引用的内容必须存在，且 ID 不得重复
  const ids = items.map((i) => i.meta.id);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) throw new Error("存在重复的内容项 ID");
  const requireItem = (ref: string, from: string) => {
    if (!idSet.has(ref)) throw new Error(`${from} 引用了不存在的内容项：${ref}`);
  };
  for (const p of pathways) for (const e of p.entries) requireItem(e.itemId, `路径 ${p.id}`);
  const pathwayIds = new Set(pathways.map((p) => p.id));
  for (const c of clusters)
    for (const pid of c.pathways)
      if (!pathwayIds.has(pid)) throw new Error(`群集 ${c.id} 引用了不存在的路径：${pid}`);
  for (const block of home.featured) for (const id of block.itemIds) requireItem(id, `首页区块「${block.title}」`);
  if (home.highlightPathwayId && !pathwayIds.has(home.highlightPathwayId))
    throw new Error(`首页 highlightPathwayId 不存在：${home.highlightPathwayId}`);

  cache = { items, pathways, clusters, home };
  return cache;
}

export function getAllContent(): ContentCache {
  return loadAll();
}

export function getPublishedItems(): LoadedItem[] {
  return loadAll().items.filter((i) => i.meta.status === "published");
}

export function getItem(id: string): LoadedItem | undefined {
  return loadAll().items.find((i) => i.meta.id === id);
}

export function getPathways(): Pathway[] {
  return loadAll().pathways;
}

export function getPathway(id: string): Pathway | undefined {
  return loadAll().pathways.find((p) => p.id === id);
}

export function getPathwayContaining(itemId: string): Pathway | undefined {
  return loadAll().pathways.find((p) => p.entries.some((e) => e.itemId === itemId));
}

export function getClusters(): Cluster[] {
  return loadAll().clusters;
}

export function getCluster(id: string): Cluster | undefined {
  return loadAll().clusters.find((c) => c.id === id);
}

export function getHome(): HomeContent {
  return loadAll().home;
}

/** 读取问题集题库（仅 assignment 类型） */
export function getItemQuiz(item: LoadedItem): Quiz | null {
  if (item.meta.type !== "assignment") return null;
  return readJson<Quiz>(
    path.join(item.dir, item.meta.quizFile),
    QuizSchema,
    "题库文件"
  );
}

/** 读取图文正文 markdown（仅 lx_text 类型） */
export function getItemMarkdown(item: LoadedItem): string | null {
  if (item.meta.type !== "lx_text") return null;
  const file = path.join(item.dir, item.meta.bodyFile);
  if (!fs.existsSync(file)) throw new Error(`图文内容缺少正文文件：${path.relative(process.cwd(), file)}`);
  return fs.readFileSync(file, "utf8");
}

/** 汇总信息（供校验脚本输出） */
export function contentSummary() {
  const { items, pathways, clusters } = loadAll();
  const byType = new Map<string, number>();
  for (const i of items) byType.set(i.meta.type, (byType.get(i.meta.type) ?? 0) + 1);
  return {
    total: items.length,
    published: items.filter((i) => i.meta.status === "published").length,
    byType: Object.fromEntries(byType),
    pathways: pathways.length,
    clusters: clusters.length,
  };
}
