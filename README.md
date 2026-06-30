# azzzhBlog

개발하면서 공부한 것들을 기록하는 기술 블로그입니다.

🔗 **[https://hyunjss.github.io/azzzhBlog](https://hyunjss.github.io/azzzhBlog)**

## 기술 스택

- **React 19** + **TypeScript**
- **Vite** — 빌드 및 개발 서버
- **React Router v7** — 클라이언트 사이드 라우팅
- **react-markdown** + **rehype-highlight** — 마크다운 렌더링 및 코드 하이라이팅
- **Giscus** — GitHub Discussions 기반 댓글
- **gh-pages** — GitHub Pages 배포

## 구조

```
src/
├── components/
│   └── BlogLayout.tsx   # 메인 3패널 레이아웃 (카테고리 / 목록 / 본문)
├── pages/
│   ├── About.tsx
│   └── PostDetail.tsx
├── posts/               # 마크다운 포스트 (.md)
├── utils/
│   └── posts.ts         # 포스트 로딩 유틸 (빌드타임 메타 + 런타임 본문)
└── types/
    └── index.ts
scripts/
├── generate-meta.mjs    # 빌드 전 포스트 메타데이터 JSON 생성
└── generate-og.mjs      # 빌드 후 OG 태그 / JSON-LD / sitemap.xml 생성
```

## 포스트 작성

`src/posts/YYYY-MM-DD-slug.md` 파일을 생성하고 아래 frontmatter를 작성합니다.

```yaml
---
title: "제목"
date: "YYYY-MM-DD"
category: "CS"
tags: ["tag1", "tag2"]
description: "한 줄 설명"
---
```

카테고리: `JavaScript` `TypeScript` `React` `FE` `CS` `운영체제` `네트워크` `자료구조` `알고리즘` `기타`

## 개발

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드
npm run deploy   # 빌드 + GitHub Pages 배포
```
