import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const postsDir = join(root, "src", "posts");
const site = "https://hyunjss.github.io/azzzhBlog";
const base = "/azzzhBlog/";
const siteName = "azzzhBlog";
const siteDescription = "프론트엔드 개발 경험과 AI Skill, AI 활용 프로젝트를 기록하는 기술 블로그";
const escape = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
function markdownFiles(dir, parent = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? markdownFiles(p, parent) : e.isFile() && e.name.endsWith(".md") ? [relative(parent, p)] : [];
  });
}
function renderMarkdown(content) {
  return renderToStaticMarkup(React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHighlight, rehypeSlug],
    components: { h1: "h2" },
  }, content));
}
function jsonLd(data) {
  return '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, "\\u003c") + "</script>";
}
function updateHead(html, { title, description, url, type, structured }) {
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escape(title) + "</title>");
  const meta = [
    [/name="description"[^>]*>/i, 'name="description" content="' + escape(description) + '" />'],
    [/property="og:type"[^>]*>/i, 'property="og:type" content="' + type + '" />'],
    [/property="og:site_name"[^>]*>/i, 'property="og:site_name" content="' + siteName + '" />'],
    [/property="og:title"[^>]*>/i, 'property="og:title" content="' + escape(title) + '" />'],
    [/property="og:description"[^>]*>/i, 'property="og:description" content="' + escape(description) + '" />'],
    [/property="og:url"[^>]*>/i, 'property="og:url" content="' + escape(url) + '" />'],
    [/name="twitter:card"[^>]*>/i, 'name="twitter:card" content="summary" />'],
    [/name="twitter:title"[^>]*>/i, 'name="twitter:title" content="' + escape(title) + '" />'],
    [/name="twitter:description"[^>]*>/i, 'name="twitter:description" content="' + escape(description) + '" />'],
  ];
  for (const [pattern, value] of meta) out = out.replace(new RegExp("<meta\\s+" + pattern.source, "i"), "<meta " + value);
  out = out.replace(/<link\s+rel="canonical"[^>]*>\s*/i, "");
  return out.replace("</head>", '<link rel="canonical" href="' + escape(url) + '" />' + structured + "</head>");
}
const posts = markdownFiles(postsDir).map(path => {
  const parsed = matter(readFileSync(join(postsDir, path), "utf8"));
  const slug = basename(path, ".md");
  const title = String(parsed.data.title || slug);
  const body = parsed.content.replace(/^#\s+(.+?)\s*\r?\n/, (heading, text) => text.trim() === title.trim() ? "" : heading);
  const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [];
  const date = parsed.data.date ? String(parsed.data.date).slice(0, 10) : "";
  return {
    slug, title, body, tags, date, category: String(parsed.data.category || "기타"),
    description: String(parsed.data.description || siteDescription),
    readingTime: Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200)),
    url: site + "/post/" + encodeURIComponent(slug) + "/",
  };
}).sort((a,b) => b.date.localeCompare(a.date));
const slugGroups = new Map();
for (const post of posts) slugGroups.set(post.slug, [...(slugGroups.get(post.slug) || []), post.title]);
const duplicateSlugs = [...slugGroups].filter(([, titles]) => titles.length > 1);
if (duplicateSlugs.length) {
  throw new Error("Duplicate post slugs would overwrite static pages: " +
    duplicateSlugs.map(([slug, titles]) => slug + " (" + titles.join(", ") + ")").join("; "));
}
const categories = ["전체", ...new Set(posts.map(p => p.category))];
const categoryNav = categories.map(category => {
  const count = category === "전체" ? posts.length : posts.filter(p => p.category === category).length;
  return '<button type="button" class="sidebar-item' + (category === "전체" ? " active" : "") + '" data-category="' + escape(category) + '"><span class="sidebar-item__label">' + escape(category) + '</span><span class="sidebar-item__count">' + count + "</span></button>";
}).join("");
function layout(post) {
  const list = posts.map(p => {
    const href = base + "post/" + encodeURIComponent(p.slug) + "/";
    return '<a data-post-category="' + escape(p.category) + '" class="post-item' + (post?.slug === p.slug ? " active" : "") + '" href="' + escape(href) + '"><div class="post-item__title">' + escape(p.title) + '</div><div class="post-item__date">' + escape(p.date) + " · " + p.readingTime + '분</div><div class="post-item__desc">' + escape(p.description) + '</div><div class="post-item__tags">' + p.tags.slice(0,3).map(t => '<span class="post-tag">#' + escape(t) + "</span>").join("") + "</div></a>";
  }).join("");
  const content = post
    ? '<a class="blog-content__back-mobile" href="' + base + '">← 목록으로</a><header class="blog-content__header"><div class="blog-content__category">' + escape(post.category) + '</div><h1 class="blog-content__title">' + escape(post.title) + '</h1><div class="blog-content__meta"><time datetime="' + escape(post.date) + '">' + escape(post.date) + '</time><span>·</span><span>' + post.readingTime + '분 읽기</span></div><div class="blog-content__tags">' + post.tags.map(t => '<span class="post-tag post-tag--lg">#' + escape(t) + "</span>").join("") + '</div></header><article class="markdown-body">' + renderMarkdown(post.body) + '</article><div class="giscus-wrap"><script src="https://giscus.app/client.js" data-repo="hyunjss/azzzhBlog" data-repo-id="R_kgDOSOcAvg" data-category="Comment" data-category-id="DIC_kwDOSOcAvs4DALvz" data-mapping="pathname" data-strict="0" data-reactions-enabled="1" data-emit-metadata="0" data-input-position="bottom" data-theme="light" data-lang="ko" crossorigin="anonymous" async></script></div>'
    : '<header class="blog-content__header"><h1 class="blog-content__title">azzzhBlog</h1><p>' + escape(siteDescription) + "</p></header>";
  return '<div class="blog-layout' + (post ? " blog-layout--post-active" : "") + '"><div class="titlebar"><div class="traffic-lights"><span class="traffic-light traffic-light--close"></span><span class="traffic-light traffic-light--min"></span><span class="traffic-light traffic-light--max"></span></div><a class="titlebar__title" href="' + base + '">' + escape(post?.title || siteName) + '</a><div class="titlebar__actions"><a class="titlebar__btn" href="' + base + '">Home</a><a class="titlebar__btn" href="' + base + 'about/">About</a><button type="button" class="titlebar__btn" data-theme-toggle>Dark</button></div></div><div class="blog-body"><aside class="blog-sidebar"><div class="blog-sidebar__section-label">카테고리</div><nav class="blog-sidebar__nav">' + categoryNav + '</nav></aside><section class="blog-list"><div class="blog-list__header"><h2 data-category-heading>전체</h2><div class="blog-list__count">' + posts.length + '개의 노트</div></div><div class="blog-list__items">' + list + '</div></section><main class="blog-content"><div class="blog-content__inner">' + content + "</div></main></div></div>";
}
const original = readFileSync(join(dist, "index.html"), "utf8");
const staticShell = original.replace(/\s*<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=)[^>]*><\/script>/g, "").replace(/<script>document.documentElement.classList.add\('js'\)<\/script>/g, "").replace("</body>", "<script>\n(() => {\n  const root = document.documentElement;\n  const saved = localStorage.getItem(\"theme\");\n  const initialTheme = saved === \"dark\" ? \"dark\" : \"light\";\n  root.setAttribute(\"data-theme\", initialTheme);\n  const themeButton = document.querySelector(\"[data-theme-toggle]\");\n  const setTheme = theme => {\n    root.setAttribute(\"data-theme\", theme);\n    localStorage.setItem(\"theme\", theme);\n    if (themeButton) themeButton.textContent = theme === \"dark\" ? \"Light\" : \"Dark\";\n    const giscus = document.querySelector(\"iframe.giscus-frame\");\n    if (giscus) giscus.contentWindow?.postMessage({ giscus: { setConfig: { theme: theme === \"dark\" ? \"dark\" : \"light\" } } }, \"https://giscus.app\");\n  };\n  setTheme(initialTheme);\n  const syncGiscusTheme = frame => {\n    const send = () => frame.contentWindow?.postMessage({ giscus: { setConfig: { theme: root.getAttribute(\"data-theme\") === \"dark\" ? \"dark\" : \"light\" } } }, \"https://giscus.app\");\n    frame.addEventListener(\"load\", send, { once: true });\n    send();\n  };\n  const existingGiscus = document.querySelector(\"iframe.giscus-frame\");\n  if (existingGiscus) {\n    syncGiscusTheme(existingGiscus);\n  } else {\n    const giscusObserver = new MutationObserver(() => {\n      const frame = document.querySelector(\"iframe.giscus-frame\");\n      if (frame) { syncGiscusTheme(frame); giscusObserver.disconnect(); }\n    });\n    giscusObserver.observe(document.body, { childList: true, subtree: true });\n  }\n  themeButton?.addEventListener(\"click\", () => setTheme(root.getAttribute(\"data-theme\") === \"dark\" ? \"light\" : \"dark\"));\n  const categoryButtons = [...document.querySelectorAll(\"[data-category]\")];\n  const posts = [...document.querySelectorAll(\"[data-post-category]\")];\n  const heading = document.querySelector(\"[data-category-heading]\");\n  categoryButtons.forEach(button => button.addEventListener(\"click\", () => {\n    const category = button.dataset.category;\n    categoryButtons.forEach(item => item.classList.toggle(\"active\", item === button));\n    posts.forEach(item => item.hidden = category !== \"전체\" && item.dataset.postCategory !== category);\n    if (heading) heading.textContent = category;\n    const count = posts.filter(item => !item.hidden).length;\n    const countNode = document.querySelector(\".blog-list__count\");\n    if (countNode) countNode.textContent = count + \"개의 노트\";\n  }));\n})();\n</script>" + "</body>");
for (const post of posts) {
  const data = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, description: post.description, url: post.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url },
    author: { "@type": "Person", name: "hyunjss" },
    publisher: { "@type": "Organization", name: siteName },
    datePublished: post.date || undefined, dateModified: post.date || undefined,
    articleSection: post.category, keywords: post.tags.join(", "),
  };
  const html = updateHead(staticShell, {
    title: post.title + " | " + siteName, description: post.description,
    url: post.url, type: "article", structured: jsonLd(data),
  }).replace('<div id="root"></div>', '<div id="root">' + layout(post) + "</div>");
  const out = join(dist, "post", post.slug);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
}
const home = updateHead(original, {
  title: siteName, description: siteDescription, url: site + "/",
  type: "website",
  structured: jsonLd({ "@context": "https://schema.org", "@type": "Blog", name: siteName, description: siteDescription, url: site + "/" }),
}).replace('<div id="root"></div>', '<div id="root"></div><div id="seo-fallback">' + layout(null) + "</div>");
writeFileSync(join(dist, "index.html"), home);

const aboutUrl = site + "/about/";
const aboutHtml = updateHead(staticShell, {
  title: "About | " + siteName,
  description: "azzzhBlog와 운영자 소개",
  url: aboutUrl,
  type: "website",
  structured: jsonLd({ "@context": "https://schema.org", "@type": "AboutPage", name: "About | " + siteName, url: aboutUrl }),
}).replace('<div id="root"></div>', '<div id="root"><main class="about-wrap"><div class="about"><a class="about__back" href="' + base + '">← 목록으로</a><h1>안녕하세요</h1><p class="about__intro">프론트엔드 개발자 <strong>hhyun</strong>입니다.<br />공부한 내용을 기록하고 공유하는 블로그입니다.</p><section class="about__section"><h2>기술 스택</h2><div class="about__skills">' + ["React", "TypeScript", "JavaScript", "HTML/CSS", "Vite"].map(skill => '<span class="skill-badge">' + escape(skill) + '</span>').join("") + '</div></section><section class="about__section"><h2>주로 다루는 주제</h2><ul><li>프론트엔드 개발 (React, TypeScript)</li><li>CS 이론 (운영체제, 네트워크, 자료구조)</li><li>알고리즘 & 문제풀이</li></ul></section><section class="about__section"><h2>Links</h2><a href="https://github.com/hyunjss" target="_blank" rel="noreferrer" class="about__link">GitHub →</a></section></div></main></div>');
mkdirSync(join(dist, "about"), { recursive: true });
writeFileSync(join(dist, "about", "index.html"), aboutHtml);

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>' + site + '/</loc><priority>1.0</priority></url>\n' +
  posts.map(p => '<url><loc>' + escape(p.url) + '</loc>' + (p.date ? '<lastmod>' + escape(p.date) + '</lastmod>' : "") + '<priority>0.8</priority></url>').join("\n") + "\n</urlset>\n";
writeFileSync(join(dist, "sitemap.xml"), sitemap);
writeFileSync(join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: " + site + "/sitemap.xml\n");
console.log("Generated " + posts.length + " standalone static article pages.");
