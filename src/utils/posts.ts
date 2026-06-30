import type { Post, PostMeta } from '../types';
import postsMeta from '../generated/posts-meta.json';

// 본문은 포스트를 열 때만 동적으로 로드 (초기 번들에서 제외)
const postFilesLazy = import.meta.glob('../posts/*.md', { query: '?raw', import: 'default' });

function extractContent(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1] : raw;
}

export function getAllPosts(): PostMeta[] {
  return postsMeta as PostMeta[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const meta = (postsMeta as PostMeta[]).find(p => p.slug === slug);
  if (!meta) return null;

  const key = `../posts/${slug}.md`;
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
