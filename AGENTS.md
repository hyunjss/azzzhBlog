# Repository Agent Instructions

## React implementation and review

For every task that writes, reviews, refactors, or optimizes React code in this repository:

1. Apply the **Vercel React Best Practices** skill in .agents/skills/vercel-react-best-practices/SKILL.md.
2. Consult the full rule catalogue in .agents/skills/vercel-react-best-practices/AGENTS.md when the change touches rendering, state, effects, data fetching, async flows, or bundle composition.
3. Prioritize the rules by impact: eliminate async waterfalls, reduce unnecessary client bundle work, then address server/client data access, rerenders, rendering, and lower-level JavaScript costs.
4. Explain material trade-offs in the PR or implementation summary. Do not apply a rule mechanically when it conflicts with the existing architecture or makes the code less clear.
5. This repository is a React + Vite client application, not a Next.js App Router application. Apply React and browser-relevant guidance directly; treat Next.js-only, React Server Components, server actions, and server cache rules as conditional guidance, not requirements.
6. Do not add dependencies, abstractions, memoization, dynamic imports, or caching solely to satisfy a checklist. Measure or identify a concrete performance/correctness reason first.
7. Preserve existing product behavior, accessibility, SEO output, and the Markdown publishing workflow. Run the relevant lint, build, browser, and SEO checks after changes.

The upstream skill is maintained by Vercel Engineering and is licensed under MIT. Source: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
