import { getItemMarkdown, getItemQuiz, type LoadedItem } from "@/lib/content/repository";
import { MarkdownText } from "./markdown-text";
import { VideoPlayer } from "./video-player";
import { QuizRenderer } from "./quiz-renderer";
import { SimulationStage } from "./simulation-stage";

/**
 * 内容播放壳：20 种内容类型共用一个壳，每种类型由注册的渲染器实现
 * （对齐 LabXchange 的 XBlock student_view_data 插件化思路）
 */
export function ItemPlayer({ item }: { item: LoadedItem }) {
  const { meta } = item;
  const fallbackType: string = meta.type;
  switch (meta.type) {
    case "lx_text":
      return <MarkdownText source={getItemMarkdown(item) ?? ""} />;
    case "video":
      return <VideoPlayer url={meta.videoUrl} title={meta.title} />;
    case "assignment":
      return (
        <QuizRenderer
          itemId={meta.id}
          quiz={getItemQuiz(item)!}
          maxAttempts={meta.maxAttempts}
        />
      );
    case "lx_simulation":
      return <SimulationStage simKey={meta.sim} title={meta.title} />;
    default:
      return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed py-20 text-slate-400">
          <p className="text-sm">该内容类型的渲染器尚未注册（{fallbackType}）</p>
        </div>
      );
  }
}
