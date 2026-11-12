import type { Post, PostMeta } from '../types';
import postsMeta from '../generated/posts-meta.json';

// 본문은 포스트를 열 때만 동적으로 로드 (초기 번들에서 제외)
const postFilesLazy = import.meta.glob('../posts/**/*.md', { query: '?raw', import: 'default' });

function extractContent(raw: string): string {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return raw;

  const titleMatch = match[1].match(/^title:\s*["']?(.*?)["']?\s*$/m);
  const title = titleMatch?.[1]?.trim();
  const content = match[2];
  const firstHeading = content.match(/^#\s+(.+?)\s*\r?\n/);

  // The frontmatter title is already rendered as the page's H1.
  return title && firstHeading?.[1]?.trim() === title
    ? content.slice(firstHeading[0].length)
    : content;
}

export function getAllPosts(): PostMeta[] {
  return postsMeta as PostMeta[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const meta = (postsMeta as PostMeta[]).find(p => p.slug === slug);
  if (!meta) return null;

  const key = `../posts/${meta.path}`;
  const loader = postFilesLazy[key];
  if (!loader) return null;

  const raw = (await loader()) as string;
  return { ...meta, content: extractContent(raw) };
}

export function getAllCategories(): string[] {
  return [...new Set(getAllPosts().map(p => p.category))];
}

export function getAllTags(): string[] {
  return [...new Set(getAllPosts().flatMap(p => p.tags))];
}
