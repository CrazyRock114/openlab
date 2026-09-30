import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="text-6xl">🔬</div>
      <h1 className="mt-6 text-2xl font-bold">没有找到这个资源</h1>
      <p className="mt-2 text-slate-500">它可能已被移动、下架，或者链接有误。</p>
      <Link
        href="/library"
        className="mt-8 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        返回资料库
      </Link>
    </div>
  );
}
