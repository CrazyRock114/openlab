/**
 * 穷举测试 L5：全站链接与资产闭合（对 out/ 静态产物）
 *   内链闭合   = 所有 href 指向存在的静态路由（含尾斜杠目录解析）
 *   资产闭合   = src 引用的 /_next、/pagefind、图标等本地资产存在
 *   外链存活   = 外部 URL HEAD/GET 可达（YouTube/CC 等，允许 403 反爬但域名解析成功）
 * 确定性退出码；需先 npm run build。
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(__dirname, "..", "..", "out");
let failures = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

/* 枚举所有 HTML 并提取 href/src */
const htmlFiles: string[] = [];
(function walk(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) htmlFiles.push(p);
  }
})(OUT);
console.log(`[枚举] HTML 页面 ${htmlFiles.length} 个`);

const internal = new Set<string>();
const assets = new Set<string>();
const external = new Set<string>();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("data:")) continue;
    if (u.startsWith("http://") || u.startsWith("https://")) {
      if (!u.includes("openlab-two.vercel.app")) external.add(u);
      else internal.add(new URL(u).pathname);
    } else if (u.startsWith("/")) {
      const clean = u.split("#")[0].split("?")[0];
      (clean.startsWith("/_next") || clean.startsWith("/pagefind") || /\.(svg|png|jpg|webp|ico|js|css|wasm)$/.test(clean) ? assets : internal).add(clean);
    } else {
      // 相对路径：以所在目录解析
      const dir = path.dirname(file).replace(OUT, "");
      internal.add(path.posix.join(dir, u).split("#")[0]);
    }
  }
}
console.log(`[枚举] 内链 ${internal.size} · 本地资产 ${assets.size} · 外链 ${external.size}`);

/* 内链闭合：/x → out/x/index.html 或 out/x.html 或 out/x（文件） */
const dead: string[] = [];
for (const link of internal) {
  const clean = decodeURIComponent(link.replace(/\/$/, "")) || "/";
  const candidates =
    clean === "/"
      ? [path.join(OUT, "index.html")]
      : [path.join(OUT, clean, "index.html"), path.join(OUT, clean + ".html"), path.join(OUT, clean)];
  if (!candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) dead.push(link);
}
check(dead.length === 0, `内链闭合：${internal.size - dead.length}/${internal.size}${dead.length ? ` 死链: ${dead.slice(0, 5).join(" | ")}` : ""}`);

/* 资产闭合 */
const missingAssets = [...assets].filter((a) => !fs.existsSync(path.join(OUT, decodeURIComponent(a).split("?")[0])));
check(missingAssets.length === 0, `资产闭合：${assets.size - missingAssets.length}/${assets.size}${missingAssets.length ? ` 缺失: ${missingAssets.slice(0, 5).join(" | ")}` : ""}`);

/* 外链存活（HEAD 优先，退化为 GET；403 反爬视为可达） */
const extList = [...external];
let extOk = 0;
const extBad: string[] = [];
(async () => {
  for (const u of extList) {
    try {
      const res = await fetch(u, { method: "HEAD", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" } });
      if (res.ok || res.status === 403 || res.status === 405) extOk++;
      else {
        const res2 = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" } });
        if (res2.ok || res2.status === 403) extOk++;
        else extBad.push(`${u} → ${res2.status}`);
      }
    } catch (err) {
      extBad.push(`${u} → ${(err as Error).message.slice(0, 40)}`);
    }
  }
  check(extBad.length === 0, `外链存活：${extOk}/${extList.length}${extBad.length ? ` 失败: ${extBad.join(" | ")}` : ""}`);
  console.log(`\n${failures === 0 ? "✓✓ 链接与资产穷举全部通过" : `✗✗ ${failures} 处失败`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
