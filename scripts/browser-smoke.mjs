import { chromium } from "playwright";

const base = "http://127.0.0.1:4173/azzzhBlog/";
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", error => errors.push(error.message));

try {
  const homeResponse = await page.goto(base, { waitUntil: "networkidle" });
  if (!homeResponse?.ok()) throw new Error("Homepage did not return a successful response");

  // Discover a real generated article URL from the sitemap.
  const sitemapResponse = await page.request.get(base + "sitemap.xml");
  if (!sitemapResponse.ok()) throw new Error("Sitemap did not return a successful response");
  const sitemap = await sitemapResponse.text();
  const articlePath = sitemap.match(/<loc>https:\/\/hyunjss\.github\.io\/azzzhBlog(\/post\/[^<]+)<\/loc>/)?.[1];
  if (!articlePath) throw new Error("Sitemap has no static article URL");
  const articleUrl = base.replace(/\/$/, "") + articlePath;

  // Direct entry and refresh must both serve a complete standalone article.
  const articleResponse = await page.goto(articleUrl, { waitUntil: "networkidle" });
  if (!articleResponse?.ok()) throw new Error("Static article did not return a successful response");
  await page.locator(".blog-layout").waitFor();
  if (await page.locator(".post-item").count() === 0) throw new Error("Static article has no post links");
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Static article content did not render");
  if (await page.locator("h1").count() !== 1) throw new Error("Article does not have exactly one H1");
  if (!await page.locator('link[rel="canonical"]').getAttribute("href")?.then(value => value === "https://hyunjss.github.io/azzzhBlog" + articlePath)) {
    throw new Error("Static article canonical URL does not match its route");
  }
  await page.reload({ waitUntil: "networkidle" });
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Static article failed after refresh");

  // Test mobile navigation and category filtering on the static article layout.
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

  await menu.click();
  if (!await page.locator(".blog-sidebar").evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Mobile category menu did not reopen");
  }
  await page.locator("[data-category]").first().click();
  const themeButton = page.locator("[data-theme-toggle]");
  await themeButton.click();
  if (await page.locator("html").getAttribute("data-theme") !== "dark") throw new Error("Dark theme toggle failed");

  // Return to the homepage before testing a post-list click: on mobile, the
  // list is intentionally hidden while an article is active.
  await page.locator(".blog-content__back-mobile").click();
  await page.waitForURL(base);
  const firstPost = page.locator(".post-item:visible").first();
  await firstPost.waitFor();
  await firstPost.click();
  await page.waitForURL(/\/post\/[^/]+\//);
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Article navigation did not render content");

  // Browser history should move between the homepage and the generated article.
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL(base);
  await page.goForward({ waitUntil: "networkidle" });
  await page.waitForURL(/\/post\/[^/]+\//);
  await page.locator(".blog-content__back-mobile").click();
  await page.waitForURL(base);

  // About must work as a direct entry point and survive a hard refresh.
  const aboutUrl = base + "about/";
  const aboutResponse = await page.goto(aboutUrl, { waitUntil: "networkidle" });
  if (!aboutResponse?.ok()) throw new Error("About page did not return a successful response");
  if (await page.locator(".about h1").count() !== 1) throw new Error("About page content did not render");
  if (await page.title() !== "About | azzzhBlog") throw new Error("About page title is incorrect");
  if (await page.locator('link[rel="canonical"]').getAttribute("href") !== "https://hyunjss.github.io/azzzhBlog/about/") {
    throw new Error("About page canonical URL is incorrect");
  }
  await page.reload({ waitUntil: "networkidle" });
  if (await page.locator(".about h1").count() !== 1) throw new Error("About page failed after refresh");
  await page.locator(".about__back").click();
  await page.waitForURL(base);

  // Verify all generated article links preserve the GitHub Pages subpath.
  const invalidPostLinks = await page.locator(".post-item").evaluateAll(items =>
    items.map(item => item.getAttribute("href")).filter(href => !href?.startsWith("/azzzhBlog/post/"))
  );
  if (invalidPostLinks.length) throw new Error("Article links do not preserve the GitHub Pages base path");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleUrl, { waitUntil: "networkidle" });
  if (await page.locator(".blog-sidebar").isHidden()) throw new Error("Desktop sidebar is hidden");

  if (errors.length) throw new Error("Browser runtime errors: " + errors.join("; "));
  console.log("Browser smoke tests passed: static article direct entry/refresh, mobile menu, category filter, theme, browser history, About direct entry/refresh, GitHub Pages links, desktop layout.");
} finally {
  await browser.close();
}
