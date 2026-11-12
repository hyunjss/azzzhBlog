/**
 * Post-build SEO generation:
 * - Recursively discovers Markdown posts
 * - Generates one static HTML document per post with rendered article content
 * - Injects canonical, Open Graph, Twitter and BlogPosting metadata
 * - Generates sitemap.xml and robots.txt
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, basename, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const POSTS_DIR = join(ROOT, "src", "posts");
const SITE_NAME = "azzzhBlog";
const SITE_URL = "https://hyunjss.github.io/azzzhBlog";
const SITE_DESC = "프론트엔드 개발 경험과 AI Skill, AI 활용 프로젝트를 기록하는 기술 블로그";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    data[key] = value;
  }
  return { data, body: match[2] };
}

function collectMarkdownFiles(dir, base) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) results.push(...collectMarkdownFiles(fullPath, base));
    else if (entry.endsWith(".md")) results.push(relative(base, fullPath));
  }
  return results;
}

function injectHead(html, { title, description, url, type = "article", date, tags = [] }) {
  const canonical = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  const tagList = Array.isArray(tags) ? tags : [];
  const jsonLd = type === "article"
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        datePublished: date || undefined,
        keywords: tagList.join(", "),
        author: { "@type": "Person", name: "azzzhBlog" },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      })}</script>`
    : `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: SITE_NAME,
        description,
        url,
      })}</script>`;

  let output = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${canonical}`);
  const replacements = [
    [/name="description" content="[^"]*"/, `name="description" content="${escapeHtml(description)}"`],
    [/property="og:title" content="[^"]*"/, `property="og:title" content="${escapeHtml(title)}"`],
    [/property="og:description" content="[^"]*"/, `property="og:description" content="${escapeHtml(description)}"`],
    [/property="og:url" content="[^"]*"/, `property="og:url" content="${escapeHtml(url)}"`],
    [/property="og:type" content="[^"]*"/, `property="og:type" content="${type}"`],
    [/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${escapeHtml(title)}"`],
    [/name="twitter:description" content="[^"]*"/, `name="twitter:description" content="${escapeHtml(description)}"`],
  ];
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  output = output.replace("</head>", `<meta property="og:site_name" content="${SITE_NAME}" />\n    <meta property="og:locale" content="ko_KR" />\n    <meta name="twitter:card" content="summary" />\n    ${jsonLd}\n  </head>`);
  return output;
}

const baseHtml = readFileSync(join(DIST, "index.html"), "utf-8");
const files = collectMarkdownFiles(POSTS_DIR, POSTS_DIR);
const posts = files.map((relPath) => {
  const raw = readFileSync(join(POSTS_DIR, relPath), "utf-8");
  const { data, body } = parseFrontmatter(raw);
  const slug = basename(relPath, ".md");
  return {
    slug,
    title: data.title || slug,
    description: data.description || SITE_DESC,
    date: data.date || "",
    category: data.category || "etc.",
    tags: Array.isArray(data.tags) ? data.tags : [],
    body,
    url: `${SITE_URL}/post/${slug}/`,
  };
}).sort((a, b) => b.date.localeCompare(a.date));

for (const post of posts) {
  const title = `${post.title} | ${SITE_NAME}`;
  const article = renderToStaticMarkup(
    React.createElement(
      "main",
      { className: "seo-prerendered-content" },
      React.createElement("article", null,
        React.createElement("header", null,
          React.createElement("h1", null, post.title),
          React.createElement("p", null, post.description),
          React.createElement("time", { dateTime: post.date }, post.date),
        ),
        React.createElement(ReactMarkdown, {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeHighlight, rehypeSlug],
        }, post.body),
      ),
    ),
  );
  const html = injectHead(baseHtml, {
    title,
    description: post.description,
    url: post.url,
    date: post.date,
    tags: post.tags,
  }).replace('<div id="root"></div>', `<div id="root">${article}</div>`);
  const outDir = join(DIST, "post", post.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

const homeUrl = `${SITE_URL}/`;
const homeLinks = posts.map((post) =>
  `<li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a><p>${escapeHtml(post.description)}</p></li>`
).join("\n");
const homeContent = `<main class="seo-prerendered-content"><h1>${SITE_NAME}</h1><p>${escapeHtml(SITE_DESC)}</p><nav aria-label="게시글 목록"><ul>${homeLinks}</ul></nav></main>`;
const indexHtml = injectHead(baseHtml, {
  title: SITE_NAME,
  description: SITE_DESC,
  url: homeUrl,
  type: "website",
}).replace('<div id="root"></div>', `<div id="root">${homeContent}</div>`);
writeFileSync(join(DIST, "index.html"), indexHtml);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${homeUrl}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
${posts.map((post) => `  <url><loc>${post.url}</loc>${post.date ? `<lastmod>${post.date}</lastmod>` : ""}<changefreq>monthly</changefreq><priority>0.8</priority></url>`).join("\n")}
</urlset>`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
