import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const sourceDir = join(root, "src", "posts");
const site = "https://hyunjss.github.io/azzzhBlog";
const errors = [];

function walk(dir, predicate) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path, predicate) : entry.isFile() && predicate(path) ? [path] : [];
  });
}
const sources = walk(sourceDir, path => path.endsWith(".md"));
const generated = walk(join(dist, "post"), path => basename(path) === "index.html");
const sourceSlugs = sources.map(path => basename(path, ".md"));
const generatedSlugs = generated.map(path => basename(join(path, "..")));
const duplicateSlugs = sourceSlugs.filter((slug, index) => sourceSlugs.indexOf(slug) !== index);
if (duplicateSlugs.length) errors.push("Duplicate source slugs: " + [...new Set(duplicateSlugs)].join(", "));
if (generated.length !== sources.length) errors.push("Article count mismatch: " + generated.length + " generated / " + sources.length + " source");

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const robots = readFileSync(join(dist, "robots.txt"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
const expectedUrls = [
  site + "/",
  site + "/about/",
  ...sourceSlugs.map(slug => site + "/post/" + encodeURIComponent(slug) + "/"),
];
for (const url of expectedUrls) {
  if (!sitemapUrls.includes(url)) errors.push("Sitemap URL missing: " + url);
}
for (const url of sitemapUrls) {
  if (!expectedUrls.includes(url)) errors.push("Unexpected sitemap URL: " + url);
}
if (sitemapUrls.length !== expectedUrls.length) errors.push("Sitemap URL count mismatch: " + sitemapUrls.length + " found / " + expectedUrls.length + " expected");
if (!robots.includes("Sitemap: " + site + "/sitemap.xml")) errors.push("robots.txt sitemap URL missing");

const rss = readFileSync(join(dist, "feed.xml"), "utf8");
const rssItems = [...rss.matchAll(/<item>[\s\S]*?<\/item>/g)].map(match => match[0]);
if (!rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) errors.push("RSS XML declaration missing");
if (!rss.includes('<rss version="2.0"')) errors.push("RSS 2.0 root element missing");
if (rssItems.length !== sources.length) errors.push("RSS item count mismatch: " + rssItems.length + " found / " + sources.length + " source");
if (!rss.includes("<title>azzzhBlog</title>") || !rss.includes("<language>ko</language>")) errors.push("RSS channel metadata missing");
if (!rss.includes(site + "/feed.xml")) errors.push("RSS self link missing");
for (const slug of sourceSlugs) {
  const url = site + "/post/" + encodeURIComponent(slug) + "/";
  if (!rss.includes("<link>" + url + "</link>")) errors.push("RSS post URL missing: " + url);
}


for (const file of generated) {
  const slug = basename(join(file, ".."));
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  const expectedCanonical = site + "/post/" + encodeURIComponent(slug) + "/";
  const article = html.match(/<article class="markdown-body">([\s\S]*?)<\/article>/)?.[1] || "";
  const h1 = (html.match(/<h1(?:\s|>)/g) || []).length;
  const text = article.replace(/<[^>]+>/g, " ").trim();
  if (canonical !== expectedCanonical) errors.push(file + ": canonical mismatch (" + (canonical || "missing") + ")");
  if (h1 !== 1) errors.push(file + ": expected exactly one H1, got " + h1);
  if (text.split(/\s+/).filter(Boolean).length < 30) errors.push(file + ": article content appears empty");
  if (!html.includes('"@type":"BlogPosting"')) errors.push(file + ": BlogPosting JSON-LD missing");
  if (!article) errors.push(file + ": rendered Markdown article missing");
  if (/<script type="module"/i.test(html)) errors.push(file + ": unexpected React module script");
  if (/<link\s+rel="modulepreload"/i.test(html)) errors.push(file + ": unexpected JavaScript modulepreload link");
  if (!html.includes('data-repo="hyunjss/azzzhBlog"') ||
      !html.includes('data-repo-id="R_kgDOSOcAvg"') ||
      !html.includes('data-category="Comment"') ||
      !html.includes('data-category-id="DIC_kwDOSOcAvs4DALvz"') ||
      !html.includes('data-mapping="pathname"') ||
      !html.includes('data-lang="ko"')) {
    errors.push(file + ": Giscus configuration missing or inconsistent");
  }
  if (!html.includes("data-theme-toggle") || !html.includes("data-category") || !html.includes("data-post-category")) {
    errors.push(file + ": static theme/category controls missing");
  }
  if (!html.includes('data-post-search') || !html.includes('data-search-text=') || !html.includes('data-posts-empty')) {
    errors.push(file + ": static post search controls missing");
  }
  if (!html.includes('rel="alternate" type="application/rss+xml"') || !html.includes(site + "/feed.xml")) errors.push(file + ": RSS discovery link missing");
  if (!html.includes("data-sidebar-toggle") || !html.includes("data-sidebar-backdrop") || !html.includes("blog-sidebar--open")) {
    errors.push(file + ": mobile sidebar navigation controls missing");
  }
  if (!html.includes('href="/azzzhBlog/about/"')) errors.push(file + ": About navigation link missing");
}

const aboutPath = join(dist, "about", "index.html");
let aboutHtml = "";
try { aboutHtml = readFileSync(aboutPath, "utf8"); }
catch { errors.push("About page missing: dist/about/index.html"); }
if (aboutHtml) {
  const canonical = aboutHtml.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (canonical !== site + "/about/") errors.push("About canonical URL mismatch");
  if (!aboutHtml.includes('"@type":"AboutPage"')) errors.push("AboutPage JSON-LD missing");
  if (!aboutHtml.includes("<h1>안녕하세요</h1>")) errors.push("About page heading missing");
  if (!aboutHtml.includes("프론트엔드 개발자")) errors.push("About page introduction missing");
  if (!aboutHtml.includes("https://github.com/hyunjss")) errors.push("About page GitHub link missing");
  if (/<script type="module"/i.test(aboutHtml)) errors.push("About page unexpectedly loads React module script");
  if (/<link\s+rel="modulepreload"/i.test(aboutHtml)) errors.push("About page unexpectedly includes JavaScript modulepreload link");
}

const home = readFileSync(join(dist, "index.html"), "utf8");
if (!home.includes('id="seo-fallback"')) errors.push("Home static fallback missing");
if (!home.includes('rel="alternate" type="application/rss+xml"')) errors.push("Home RSS discovery link missing");
if (!home.includes('"@type":"Blog"')) errors.push("Blog JSON-LD missing on home page");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Verified " + generated.length + " standalone articles, About page, canonical URLs, JSON-LD, Giscus, static controls, sitemap and robots.txt.");
