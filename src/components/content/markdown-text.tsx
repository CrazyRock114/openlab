import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 图文课程渲染器：Markdown + GFM（表格/任务列表） */
export function MarkdownText({ source }: { source: string }) {
  return (
    <article className="prose prose-slate max-w-none rounded-2xl border bg-white p-6 shadow-sm prose-a:font-medium prose-a:text-brand-700 sm:p-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </article>
  );
}
