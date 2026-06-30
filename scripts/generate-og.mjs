/**
 * Post-build script: 포스트별 정적 HTML 생성
 * - OG / Twitter 태그 주입
 * - JSON-LD Article 구조화 데이터 주입
 * - canonical URL 주입
 * - sitemap.xml 생성
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SITE_NAME = "azzzhBlog";
const SITE_URL = "https://hyunjss.github.io/azzzhBlog";
const SITE_DESC = "개발하면서 공부한 것들을 기록하는 공간";

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) fm[key] = val;
  }
  return fm;
}

function injectHead(
  html,
  { title, description, url, type = "article", date, tags }
) {
  const canonical = `<link rel="canonical" href="${url}" />`;

  const jsonLd =
    type === "article"
      ? `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(description)},
    "url": ${JSON.stringify(url)},
    "datePublished": ${JSON.stringify(date || "")},
    "keywords": ${JSON.stringify(
      (tags || "")
        .split(",")
        .map((t) => t.trim())
        .join(", ")
    )},
    "author": { "@type": "Person", "name": "hyunjss" },
    "publisher": { "@type": "Organization", "name": ${JSON.stringify(
      SITE_NAME
    )} }
  }
  </script>`
      : `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": ${JSON.stringify(SITE_NAME)},
    "description": ${JSON.stringify(description)},
    "url": ${JSON.stringify(url)}
  }
  </script>`;

  return html
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${title}</title>\n    ${canonical}`
    )
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/g,
      `$1${description}$2`
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/g,
      `$1${title}$2`
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/g,
      `$1${description}$2`
    )
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/g, `$1${url}$2`)
    .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/g, `$1${type}$2`)
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/g,
      `$1${title}$2`
    )
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/g,
      `$1${description}$2`
    )
    .replace("</head>", `${jsonLd}\n  </head>`);
}

const distHtml = readFileSync(join(ROOT, "dist", "index.html"), "utf-8");
const postsDir = join(ROOT, "src", "posts");
const files = readdirSync(postsDir).filter((f) => f.endsWith(".md"));

const postMetas = [];

for (const file of files) {
  const slug = basename(file, ".md");
  const content = readFileSync(join(postsDir, file), "utf-8");
  const meta = parseFrontmatter(content);

  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
  const description = meta.description || SITE_DESC;
  const url = `${SITE_URL}/post/${slug}`;

  const html = injectHead(distHtml, {
    title,
    description,
    url,
    date: meta.date,
    tags: meta.tags,
  });

  const outDir = join(ROOT, "dist", "post", slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);

  postMetas.push({ slug, date: meta.date || "" });
}

// index.html에도 canonical + JSON-LD 주입
const indexHtml = injectHead(distHtml, {
  title: SITE_NAME,
  description: SITE_DESC,
  url: SITE_URL,
  type: "website",
});
writeFileSync(join(ROOT, "dist", "index.html"), indexHtml);

// sitemap.xml 생성
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${postMetas
  .sort((a, b) => b.date.localeCompare(a.date))
  .map(
    ({ slug, date }) => `  <url>
    <loc>${SITE_URL}/post/${slug}</loc>
    ${date ? `<lastmod>${date}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

writeFileSync(join(ROOT, "dist", "sitemap.xml"), sitemap);
