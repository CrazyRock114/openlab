/** 视频渲染器：解析 YouTube / Vimeo / Bilibili 链接为嵌入播放器 */

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const bili = url.match(/bilibili\.com\/video\/(BV\w+)/i);
  if (bili) return `https://player.bilibili.com/player.html?bvid=${bili[1]}&autoplay=0`;
  return null;
}

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed py-16 text-slate-400">
        <p className="text-sm">暂不支持该视频源：{url}</p>
        <p className="mt-1 text-xs">支持 YouTube / Vimeo / Bilibili 链接</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
      <iframe
        src={embed}
        title={title}
        loading="lazy"
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
