import { chromium } from "playwright";

const base = "http://127.0.0.1:4173/azzzhBlog/";
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", error => errors.push(error.message));

try {
  const response = await page.goto(base, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error("Homepage did not return a successful response");
  await page.locator(".blog-layout").waitFor();
  if (await page.locator(".post-item").count() === 0) throw new Error("Homepage has no post links");

  const menu = page.locator("[data-sidebar-toggle]");
  await menu.click();
  if (!await page.locator(".blog-sidebar").evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Mobile category menu did not open");
  }
  await page.locator("[data-sidebar-backdrop]").click({ position: { x: 350, y: 700 } });
  if (await page.locator(".blog-sidebar").evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Mobile category menu did not close from backdrop");
  }

  const category = page.locator("[data-category]").nth(1);
  const categoryName = await category.getAttribute("data-category");
  await menu.click();
  await category.click();
  if (await page.locator(".blog-sidebar").evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Category selection did not close mobile menu");
  }
  const visibleCategories = await page.locator(".post-item:visible").evaluateAll(items => [...new Set(items.map(el => el.getAttribute("data-post-category")))]);
  if (visibleCategories.some(value => value !== categoryName)) throw new Error("Category filter displayed unrelated posts");

  await page.locator("[data-category]").first().click();
  const themeButton = page.locator("[data-theme-toggle]");
  await themeButton.click();
  if (await page.locator("html").getAttribute("data-theme") !== "dark") throw new Error("Dark theme toggle failed");

  await page.locator(".post-item").first().click();
  await page.waitForURL(/\/post\/[^/]+\//);
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Static article content did not render");
  if (await page.locator("h1").count() !== 1) throw new Error("Article does not have exactly one H1");
  await page.locator(".blog-content__back-mobile").click();
  await page.waitForURL(base);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base, { waitUntil: "networkidle" });
  if (await page.locator(".blog-sidebar").isHidden()) throw new Error("Desktop sidebar is hidden");

  if (errors.length) throw new Error("Browser runtime errors: " + errors.join("; "));
  console.log("Browser smoke tests passed: mobile menu, category filter, theme, article navigation, desktop layout.");
} finally {
  await browser.close();
}
