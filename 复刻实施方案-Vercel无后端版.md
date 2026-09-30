# 复刻实施方案 · Vercel 无后端版

> 前置文档：[LabXchange-全面调研报告.md](./LabXchange-全面调研报告.md)（第 5 章原方案的替代版本）
> 目标：**零自建服务器、零运维**，`git push` 即部署到 Vercel；按同样的产品骨架（资产 → Pathway → Cluster + 资料库 + 班级）实现 LabXchange 式教学站

---

## 1. 设计原则

1. **内容即代码**：所有公开内容（20 种内容类型的实例、Pathway、Cluster）以 JSON/MDX 文件放在 git 仓库里，**构建期**完成校验、搜索索引、筛选聚合、sitemap、OG 图——把 LabXchange 的 Elasticsearch 聚合和 Django SEO 块全部搬到 build 时
2. **用户数据本地优先**：学习进度、收藏、笔记、私有内容全部存浏览器（localStorage/IndexedDB），不做账号也能用——LabXchange 的模拟实验本来就是无后端状态，天然契合
3. **动态功能按需上**：班级/云端进度等需要共享状态的功能，单独拆成「动态层」，用 Vercel 平台原语（Postgres/KV/Blob + Route Handlers）实现——依然没有传统后端进程
4. **模拟实验即 React 组件**：每个虚拟实验是仓库里的一个 React 组件（或 iframe 沙箱页），进度只存本地，完成事件可选上报

由此分成两档，**同一套代码渐进升级**：

| | Tier 1 · 纯静态 | Tier 2 · 动态层 |
|---|---|---|
| 部署 | Vercel 静态站 | Vercel 静态站 + Route Handlers |
| 账号 | 无（本地身份） | Auth.js / Clerk（托管） |
| 进度/收藏 | IndexedDB（仅本机） | 本地 + 云同步 |
| 班级 | 「布置码」文件/链接分发，无中央评分 | 真·班级：审批/布置/进度矩阵 |
| 数据库 | 无 | Vercel Postgres（Neon）+ KV |
| 运维 | 零 | 零（全托管） |

---

## 2. 总体架构

```
                        ┌────────────────────────────┐
                        │   Git 仓库（内容 + 代码）      │
                        │  /content/items|pathways|…   │
                        └──────────┬─────────────────┘
                              git push 触发
                                   ▼
┌─────────────────────── Vercel Build（CI） ────────────────────────┐
│ Zod 全量校验内容 → 生成 Pagefind 搜索索引 + facets 聚合             │
│ → next/image 优化 → sitemap.xml 程序化生成 → OG 图生成             │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
        用户 ──► Vercel Edge/CDN（Next.js App Router，SSG/ISR）
                             │
   ┌─────────────────────────┼──────────────────────────┐
   ▼                         ▼                          ▼
静态页面(SSG)          客户端本地层                  Tier 2 动态层(可选)
 ·首页/资料库/详情       ·IndexedDB：进度/收藏/        ·/api/* Route Handlers
 ·Pathway/Cluster       笔记/私有内容/Remix 草稿       ·Vercel Postgres：班级/成员/
 ·Pagefind 本地搜索     ·Zustand + idb 封装           布置/进度上报（几张表而已）
 ·MDX 正文渲染                                        ·Vercel KV：浏览计数/热搜词
                                                      ·Vercel Blob：用户头像/封面
媒体：Vercel Blob / R2（视频建议直接嵌 YouTube/Vimeo，免转码免流量费）
```

---

## 3. 服务映射表（LabXchange → Vercel 版）

| LabXchange 原方案 | 本方案替代 | 说明 |
|---|---|---|
| Django + DRF（210 端点） | **不需要**。读操作全部构建期生成 / 客户端直连；写操作仅 Tier 2 少数 Route Handlers | 预计 Tier 2 也只需 10–15 个 API 路由 |
| Open edX Blockstore（版本化内容库） | git 仓库即内容库（天然版本化），`/content/**` 目录 + JSON Schema | PR = 内容审核流（对应它的机构发布审核） |
| XBlock student_view_data | 内容类型插件注册表：每种类型一个 React 渲染器 + Zod payload schema | 20 类共用 ItemPlayer 壳不变 |
| Elasticsearch 搜索 + facets 聚合 | **Pagefind**（构建期索引、纯静态、多语言）+ 构建期预算 facets JSON；客户端过滤排序 | 万级内容规模完全够用；超 5 万再换 Algolia/Typesense Cloud |
| django-oauth-toolkit 账号体系 | Tier 1 无账号；Tier 2 Auth.js（GitHub/Google OAuth + magic link）或 Clerk | LabXchange 的注册向导（身份选择→年龄→科目）保留为前端 onboarding 流，结果存本地/用户表 |
| PostgreSQL 用户数据 | Tier 1 IndexedDB（Dexie.js）；Tier 2 Vercel Postgres | 数据模型见 §5 |
| S3 + CloudFront 媒体 | Vercel Blob 或 Cloudflare R2 + next/image；视频用 YouTube/Vimeo 嵌入或 Mux（按需） | 它的 `__sized__` 裁剪 → `next/image` 远程优化 |
| SEO 混合渲染（loading 遮罩 + seo-crawlable-content） | **Next.js SSG/ISR 原生解决**：详情页静态生成，完整 meta + JSON-LD（schema.org LearningResource）+ 程序化 sitemap | 比原方案更干净 |
| 首页可配置精选区块（explore_contents API） | `content/home.json` 配置文件（feature_card/pathways/clusters/list 区块类型枚举照搬） | 改版 = 提 PR |
| 浏览/收藏/重混计数 | Tier 1 不做；Tier 2 Vercel KV 原子自增（`INCR items:{id}:views`） | 热搜词同理存 KV |
| 班级（代码/审批/布置/进度矩阵/CSV） | Tier 1：**布置码**（教师导出 assignment JSON → 学生导入，进度各自本地）；Tier 2：真班级（Postgres 4 张表 + 十几个 Route Handler） | 见 §6.4 |
| Pathway Clone-and-Edit（Remix） | 客户端把 pathway JSON 克隆进 IndexedDB → 路径编辑器改本地草稿 → 导出 JSON 分享 / 提 PR 进公共库 | clones 计数 Tier 2 用 KV |
| 讨论区 | **Giscus**（GitHub Discussions 驱动，零后端、免spam）；班级内讨论仅 Tier 2 | |
| react-intl 31 语言 | next-intl，语言包 JSON 懒加载 + RTL 方案照搬原结论 | |
| Datadog RUM / GA / Amplitude | Vercel Analytics + PostHog Cloud + Sentry（全托管） | |
| 虚拟实验（HTML5 无后端状态） | **不变**：React 组件 + Lottie，进度本地，完成事件可选上报 | 唯一零改动的能力 |

---

## 4. 内容管线（核心）

### 4.1 仓库结构

```
/content
  /items/<org>/<8位hex>/
    item.json            # 元数据（下述 schema）
    content.mdx          # lx_text 类型的正文
    quiz.json            # question/assignment 的题目数据
    sim.config.json      # simulation：指向组件注册名 + 实验参数
    cover.jpg
  /pathways/<uuid>.json  # { title, objectives[], entries: [{itemId, notes, order}] }
  /clusters/<slug>.json
  /home.json             # 首页可配置区块
  /organizations/<slug>.json
/messages/<locale>.json  # i18n 语言包
```

### 4.2 item.json 元数据 schema（Zod 定义，构建期全量校验）

沿用原报告的数据模型，落到文件：

```jsonc
{
  "id": "cx:acme:7c13cc95:lx_simulation:1",   // 四段式 ID = 目录路径，天然不可变
  "type": "lx_simulation",                     // 20 类枚举
  "title": "凝胶电泳",
  "description": "…",
  "subjectArea": "biological-sciences",
  "backgroundKnowledge": "some",               // none | some | extensive（差异化保留）
  "learningObjectives": ["…"],
  "tags": ["gel", "dna"],
  "durationMinutes": 25,
  "language": "zh-hans",
  "license": "CC_BY_4",                        // LX1 | CC_BY_* | CC_BY_NC_* | PD
  "authors": [{ "name": "…", "org": "acme" }],
  "status": "published"
}
```

### 4.3 构建期产物（`vercel build` 内完成）

1. Zod 校验全部内容（坏数据直接 fail CI）
2. 生成 `search-index/`（Pagefind 分片索引，按需拉取）
3. 生成 `facets.json`：学科/类型/背景知识/语言/时长/来源 各维度的 `{key, count}`（对应 ES aggregations，只是构建期算好）
4. 程序化 `sitemap.xml`（items/pathways/clusters 三分册，对应它的做法）
5. 每个内容页 SSG：完整 OG/Twitter meta + `LearningResource` JSON-LD

---

## 5. 数据模型调整

### Tier 1（纯本地，IndexedDB via Dexie）

```
progress(itemKey, status, percent, score, attempts, updatedAt)
favorites(itemKey, addedAt)
notes(itemKey, body, updatedAt)
draftItems(id, type, payload)         # 私有创作内容
draftPathways(id, entries[], meta)    # Remix 草稿
settings(profile, locale, onboarding) # 注册向导结果（身份/科目/年级）
```

### Tier 2 增量（Vercel Postgres，共 6 张表，无其他基础设施）

```
users(id, email, name, role, locale, ...)          -- Auth.js/Clerk 同步
progress(user_id, item_key, …)                     -- 云同步，端側继续写 IndexedDB，联网时 merge
classrooms(id, code, title, owner_id, archived)
classroom_members(classroom_id, user_id, status)   -- pending/approved/rejected（审批制照搬）
assignments(id, classroom_id, item_key, due, max_attempts, points, assignees)
classroom_progress(user_id, assignment_id, item_key, percent, score)  -- 进度矩阵 + CSV 导出
```

Route Handlers 仅需：`POST /classes`（创建+生成6位码）、`POST /classes/join`、`PATCH /members/:id`（审批）、`POST /assignments`、`POST /progress`、`GET /classes/:id/matrix`（教师进度）、`POST /counters/:key`（KV 计数）——**合计 ~12 个端点，替代原方案 210 个**。

---

## 6. 关键功能实现要点

**6.1 资料库搜索**：Pagefind 客户端搜索（标题/描述/正文/标签加权）+ facets.json 驱动筛选面板 + 客户端排序（相关度/最新/字母序免费；最多浏览 Tier 2 从 KV 读）。内容类型 pill、背景知识门槛筛选、结果卡片与 kebab 菜单照原设计。内容 <1 万条时首屏索引按需加载，性能无忧。

**6.2 内容详情壳（ItemPlayer）**：单一路由 `library/items/[...id]`，SSG 出壳；客户端按 type 从插件注册表取渲染器——`text`(MDX) / `video`(YouTube/Vimeo 嵌入+字幕) / `question`(作答器组件) / `simulation`(React 组件或 iframe 沙箱) / 其余类型增量注册。完成标记写本地 progress，Tier 2 异步上报。

**6.3 Pathway / Remix**：目录页 SSG；逐项学习视图客户端路由（上一项/下一项/标记完成/进度条照搬）。Remix：一键把 pathway JSON 存入 `draftPathways` → 编辑器增删排序 → 导出文件分享，或 PR 进公共库（等效它的「个人不能公开发布、机构才能发布」审核模型——用 git 权限实现，零成本）。

**6.4 班级**：
- Tier 1「布置码」：教师端把若干 item + 截止时间/次数/分值导出为一个 `assignment.json`（或含压缩 payload 的链接），学生导入后本地跟踪；教师无法看学生进度（诚实告知）
- Tier 2：§5 的 6 张表 + 12 个端点，审批制、防重复布置、进度矩阵 + CSV 全部照原模型实现

**6.5 SEO**：SSG + JSON-LD + sitemap，配 `next/image` 与 ISR（内容更新 = 重新部署，全量重建万级页面约几分钟，可接受；内容大了再切增量）

**6.6 i18n**：next-intl + `messages/<locale>.json` 懒加载 + RTL（ar/he/fa/ur）body class 方案照搬；语言协商顺序 cookie → navigator → en

**6.7 虚拟实验**：每实验一个目录（组件 + Lottie 素材 + 实验记录本配置），通过 `sim.config.json` 注册；无后端状态与原版一致。**这是内容投入，不是架构问题**——建议做 3–5 个高质量标杆（如凝胶电泳/PCR/移液）验证管线

---

## 7. 分期路线图（调整版）

| 期 | 内容 | 产出 | 量级 |
|---|---|---|---|
| **M0 骨架**（~2 周） | Next.js 15 + TS + Tailwind/shadcn 脚手架；content 目录 + Zod schema + CI 校验；ItemPlayer 壳 + text/video/question/simulation 占位渲染器；SSG 详情页 + SEO + sitemap | 4 种内容类型可发布可访问 | 纯前端 |
| **M1 资料库**（~2 周） | Pagefind 索引 + facets 筛选面板 + 排序分页 + 内容卡片；首页（home.json 配置区块 + Hero） | 可搜索的完整公共库 | 纯前端 |
| **M2 路径与本地身份**（~2 周） | Pathway 编辑器（本地草稿）+ 逐项学习视图 + Cluster；IndexedDB 层（进度/收藏/笔记）+ onboarding 向导（本地）；Remix 导出 | 核心学习闭环，零账号 | 纯前端 |
| **M3 布置码**（~1 周） | 教师 assignment.json 导出 / 学生导入；本地进度报告页（学生自查、可导出发给老师） | 轻量教学闭环 | 纯前端 |
| **M4 动态层（可选）**（~3 周） | Auth.js/Clerk + Vercel Postgres/KV；云进度同步；真班级（6 表 12 端点）+ 进度矩阵 CSV；浏览计数 | 对齐 LabXchange 教学管理能力 | Vercel 原语 |
| **持续** | 虚拟实验内容管线（每期 3–5 个）；i18n 扩语言；Giscus 讨论 | 护城河 | 内容投入 |

> 对比原方案：MVP 周期从 ~17 周压到 **~7 周出完整静态版**；TypeScript 全栈单语言；没有 DevOps。

---

## 8. 诚实的权衡（相比有后端版失去了什么）

1. **中央进度/评分**：Tier 1 教师看不到学生数据——教学严肃场景必须上 M4 动态层
2. **搜索语义能力**：Pagefind 是词法搜索，没有 ES 同义词/相关性调优——内容过 5 万或做多语言混合检索时迁 Algolia/Typesense Cloud（仍是托管，无运维）
3. **实时计数与排行**：浏览量/收藏数在 Tier 1 不存在（可显示"构建时统计"）；Tier 2 用 KV 补
4. **内容贡献流**：非技术教师没法直接发布——需要一个简单的「内容提交」入口（表单生成 PR，或用 Sveltia/Decap CMS 提供 git 化后台）
5. **大文件视频**：别放仓库（Vercel 部署包限制），用 YouTube/Vimeo/Blob + 播放器组件
6. **Vercel Hobby 免费层限制**：个人非商用免费；商用需 Pro（$20/月/席位）；Postgres/KV/Blob 有免费额度，教学站初期流量基本够用，超量后成本仍远低于自建

---

## 9. 技术选型清单（一页版）

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router, SSG/ISR）+ TypeScript + Tailwind CSS + shadcn/ui |
| 状态/本地存储 | Zustand + Dexie（IndexedDB） |
| 内容校验 | Zod（构建期 + 运行时同 schema） |
| 正文 | MDX（@next/mdx） |
| 搜索 | Pagefind（→ 规模大后 Algolia/Typesense Cloud） |
| i18n | next-intl（懒加载语言包 + RTL） |
| 题目/作答器 | 自研 React 组件（题库 quiz.json schema） |
| 模拟实验 | React 组件 + Lottie（react-lottie）+ iframe 沙箱选项 |
| 图表/科学可视化 | D3 或 ECharts |
| 认证（M4） | Auth.js v5（或 Clerk） |
| 动态数据（M4） | Vercel Postgres（Neon）+ Vercel KV（Upstash）+ Vercel Blob |
| 讨论 | Giscus |
| 可观测 | Vercel Analytics + PostHog Cloud + Sentry |
| 部署 | Vercel（git push 即上线，PR 预览环境白送——内容审核直接用 Preview URL） |
