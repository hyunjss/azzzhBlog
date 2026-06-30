/**
 * Pre-build script: 포스트 frontmatter만 추출해서 JSON으로 생성
 *
 * src/posts/**\/*.md 를 재귀 탐색해 content 없이 메타데이터만 담은
 * src/generated/posts-meta.json 을 만든다.
 * 덕분에 초기 번들에 markdown 본문이 포함되지 않고,
 * 본문은 포스트를 열 때 동적으로 로드된다.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, basename, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: "" };

  const data = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    data[key] = value;
  }
  return { data, content: match[2] };
}

function calcReadingTime(content) {
  return Math.ceil(content.trim().split(/\s+/).length / 200);
}

/** src/posts/ 하위를 재귀 탐색해 .md 파일의 상대 경로 목록을 반환 */
function collectMarkdownFiles(dir, base) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, base));
    } else if (entry.endsWith(".md")) {
      results.push(relative(base, fullPath));
    }
  }
  return results;
}

const postsDir = join(ROOT, "src", "posts");
const relativePaths = collectMarkdownFiles(postsDir, postsDir);

const posts = relativePaths
  .map((relPath) => {
    const slug = basename(relPath, ".md");
    const { data, content } = parseFrontmatter(
      readFileSync(join(postsDir, relPath), "utf-8")
    );
    return {
      slug,
      path: relPath,
      title: data.title ?? slug,
      date: data.date ?? "",
      category: data.category ?? "etc.",
      tags: Array.isArray(data.tags) ? data.tags : [],
      description: data.description ?? "",
      readingTime: calcReadingTime(content),
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

mkdirSync(join(ROOT, "src", "generated"), { recursive: true });
writeFileSync(
  join(ROOT, "src", "generated", "posts-meta.json"),
  JSON.stringify(posts, null, 2),
  "utf-8"
);
