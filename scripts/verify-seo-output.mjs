import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dist = join(process.cwd(), "dist");
const sourceDir = join(process.cwd(), "src", "posts");
function walk(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path, ext) : entry.isFile() && path.endsWith(ext) ? [path] : [];
  });
}
const sources = walk(sourceDir, ".md");
const generated = walk(join(dist, "post"), "index.html");
const errors = [];
if (generated.length !== sources.length) errors.push("Article count mismatch: " + generated.length + " generated / " + sources.length + " source");
for (const file of generated) {
  const html = readFileSync(file, "utf8");
  const article = html.match(/<article class="markdown-body">([\s\S]*?)<\/article>/)?.[1] || "";
  const h1 = (html.match(/<h1(?:\s|>)/g) || []).length;
  const text = article.replace(/<[^>]+>/g, " ").trim();
  if (h1 !== 1) errors.push(file + ": expected exactly one H1, got " + h1);
  if (text.split(/\s+/).filter(Boolean).length < 30) errors.push(file + ": article content appears empty");
  if (!html.includes('rel="canonical"')) errors.push(file + ": canonical missing");
  if (!html.includes('"@type":"BlogPosting"')) errors.push(file + ": BlogPosting JSON-LD missing");
  if (!html.includes('class="markdown-body"')) errors.push(file + ": rendered Markdown missing");
  if (/<script type="module"/i.test(html)) errors.push(file + ": unexpected React module script");
}
const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const robots = readFileSync(join(dist, "robots.txt"), "utf8");
if ((sitemap.match(/<loc>/g) || []).length !== sources.length + 1) errors.push("Sitemap URL count mismatch");
if (!robots.includes("Sitemap: https://hyunjss.github.io/azzzhBlog/sitemap.xml")) errors.push("robots.txt sitemap URL missing");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Verified " + generated.length + " standalone article pages, H1, content, canonical, JSON-LD, sitemap and robots.txt.");
