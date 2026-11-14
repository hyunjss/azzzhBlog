/**
 * Generate lightweight post metadata for the React application.
 * Markdown bodies remain lazy-loaded; gray-matter keeps frontmatter parsing
 * consistent with the static HTML generator.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "src", "posts");

function collectMarkdownFiles(dir, base) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(fullPath, base);
    return entry.isFile() && entry.name.endsWith(".md") ? [relative(base, fullPath)] : [];
  });
}

function calcReadingTime(content) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200));
}

const relativePaths = collectMarkdownFiles(postsDir, postsDir);
const posts = relativePaths.map(path => {
  const parsed = matter(readFileSync(join(postsDir, path), "utf8"));
  const slug = basename(path, ".md");
  return {
    slug,
    path,
    title: String(parsed.data.title || slug),
    date: parsed.data.date ? String(parsed.data.date).slice(0, 10) : "",
    category: String(parsed.data.category || "기타"),
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
    description: String(parsed.data.description || ""),
    readingTime: calcReadingTime(parsed.content),
  };
}).sort((a, b) => b.date.localeCompare(a.date));

const slugGroups = new Map();
for (const post of posts) slugGroups.set(post.slug, [...(slugGroups.get(post.slug) || []), post.path]);
const duplicates = [...slugGroups].filter(([, paths]) => paths.length > 1);
if (duplicates.length) {
  throw new Error("Duplicate post slugs would overwrite routes: " +
    duplicates.map(([slug, paths]) => slug + " (" + paths.join(", ") + ")").join("; "));
}

const outputDir = join(root, "src", "generated");
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "posts-meta.json"), JSON.stringify(posts, null, 2) + "\n", "utf8");
console.log("Generated metadata for " + posts.length + " posts; slugs are unique.");
