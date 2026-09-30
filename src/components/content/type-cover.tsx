import { cn } from "@/lib/utils";
import { typeIcon, typeEn, typeGradient } from "@/lib/content/labels";
import type { ItemType } from "@/lib/content/schema";

/** 内容类型封面：渐变底 + 类型图标（无图片依赖，构建期零成本） */
export function TypeCover({
  type,
  className,
  iconClassName,
}: {
  type: ItemType;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = typeIcon(type);
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center bg-gradient-to-br",
        typeGradient(type),
        className
      )}
    >
      <Icon className={cn("h-12 w-12 text-white/90", iconClassName)} strokeWidth={1.5} />
      <span className="absolute bottom-2 right-3 text-[10px] font-semibold tracking-[0.18em] text-white/55">
        {typeEn(type)}
      </span>
    </div>
  );
}
