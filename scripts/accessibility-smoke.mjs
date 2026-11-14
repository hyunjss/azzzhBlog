import { readdirSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = "http://127.0.0.1:4173/azzzhBlog/";
const postDirectory = new URL("../dist/post/", import.meta.url);
const post = readdirSync(postDirectory, { withFileTypes: true })
  .find(entry => entry.isDirectory());

if (!post) throw new Error("No generated article directory found for accessibility testing.");

const routes = [
  { name: "homepage", path: "" },
  { name: "article", path: "post/" + encodeURIComponent(post.name) + "/" },
  { name: "about", path: "about/" },
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];
const themes = ["light", "dark"];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const violations = [];
let scans = 0;

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      for (const theme of themes) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(base + route.path, { waitUntil: "networkidle" });
        if (!response?.ok()) {
          throw new Error(route.name + " returned an unsuccessful response at " + base + route.path);
        }

        await page.evaluate(selectedTheme => {
          document.documentElement.setAttribute("data-theme", selectedTheme);
        }, theme);

        const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
        scans += 1;

        for (const violation of result.violations) {
          violations.push({
            page: route.name,
            viewport: viewport.name,
            theme,
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            helpUrl: violation.helpUrl,
            nodes: violation.nodes.map(node => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          });
        }

        console.log(
          "Accessibility scan " + scans + ": " + route.name + " / " +
          viewport.name + " / " + theme + " — " + result.violations.length + " violation(s)"
        );
      }
    }
  }

  // The mobile category drawer is a distinct interactive state from the closed page.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await page.locator("[data-sidebar-toggle]").click();
  await page.locator(".blog-sidebar--open").waitFor();
  const drawerResult = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  scans += 1;

  for (const violation of drawerResult.violations) {
    violations.push({
      page: "homepage-mobile-drawer-open",
      viewport: "mobile",
      theme: "light",
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    });
  }

  console.log(
    "Accessibility scan " + scans + ": homepage mobile drawer open / light — " +
    drawerResult.violations.length + " violation(s)"
  );

  if (violations.length) {
    console.error(JSON.stringify({ scans, violationCount: violations.length, violations }, null, 2));
    throw new Error("Accessibility audit found " + violations.length + " WCAG violation group(s).");
  }

  console.log(
    "Accessibility audit passed: " + scans +
    " WCAG 2.1/2.2 A/AA scans across homepage, article, About, mobile drawer, responsive viewports, and themes."
  );
} finally {
  await browser.close();
}
