/**
 * Post-build script: 포스트별 정적 HTML 생성 (OG 태그 주입)
 *
 * 빌드 후 dist/index.html 을 기반으로
 * dist/post/[slug]/index.html 을 포스트마다 생성한다.
 * 크롤러(Slack, KakaoTalk, Twitter 등)가 OG 태그를 읽을 수 있게 된다.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_NAME = 'hhyun.dev';
const SITE_URL = 'https://hhyun.github.io';
const SITE_DESC = '개발하면서 공부한 것들을 기록하는 공간';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"|"$/g, '');
    if (key) fm[key] = val;
  }
  return fm;
}

function injectOg(html, { title, description, url, type = 'article' }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/g,    `$1${description}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/g,   `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/g, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/g,     `$1${url}$2`)
    .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/g,    `$1${type}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/g,  `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/g, `$1${description}$2`);
}

const distHtml = readFileSync(join(ROOT, 'dist', 'index.html'), 'utf-8');
const postsDir = join(ROOT, 'src', 'posts');
const files = readdirSync(postsDir).filter(f => f.endsWith('.md'));

let count = 0;
for (const file of files) {
  const slug = basename(file, '.md');
  const content = readFileSync(join(postsDir, file), 'utf-8');
  const meta = parseFrontmatter(content);

  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
  const description = meta.description || SITE_DESC;
  const url = `${SITE_URL}/post/${slug}`;

  const html = injectOg(distHtml, { title, description, url });

  const outDir = join(ROOT, 'dist', 'post', slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  count++;
}

console.log(`✅ OG pre-rendering 완료: ${count}개 포스트`);
