---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when writing, reviewing, or refactoring React code, data fetching, bundle optimization, or performance improvements.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# Vercel React Best Practices

This repository vendors the Vercel Engineering skill for agent use.

- When to apply: writing new React components, implementing data fetching, reviewing performance, refactoring React code, and optimizing bundle size or load times.
- Coverage: 70 rules across 8 categories, ordered by impact:
  1. Eliminating async waterfalls (async-*) — critical
  2. Bundle-size optimization (bundle-*) — critical
  3. Server-side performance (server-*) — high
  4. Client-side data fetching (client-*) — medium-high
  5. Rerender optimization (rerender-*) — medium
  6. Rendering performance (rendering-*) — medium
  7. JavaScript performance (js-*) — low-medium
  8. Advanced patterns (advanced-*) — low

## How agents should use this skill

Read the full guide in AGENTS.md for the detailed rules and code examples. Follow the highest-impact relevant rules first.

This repository uses React + Vite, not Next.js. Apply React/browser guidance directly; do not impose Next.js-only or server-component patterns where the project has no corresponding runtime.

Upstream source: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
