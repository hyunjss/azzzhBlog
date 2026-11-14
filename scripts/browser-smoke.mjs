import { chromium } from "playwright";

const base = "http://127.0.0.1:4173/azzzhBlog/";
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", error => errors.push(error.message));

try {
  const homeResponse = await page.goto(base, { waitUntil: "networkidle" });
  if (!homeResponse?.ok()) throw new Error("Homepage did not return a successful response");

  // The generated homepage is a complete static document; it must not download the unused React application.
  await page.locator(".blog-layout").waitFor();
  if (await page.locator("#seo-fallback").count() !== 1) throw new Error("Static homepage shell is missing");
  if (await page.locator('script[src], script[type="module"], link[rel="modulepreload"]').count() !== 0) {
    throw new Error("Static homepage unexpectedly references a JavaScript bundle");
  }
  const homepageJsRequests = await page.evaluate(() =>
    performance.getEntriesByType("resource")
      .filter(entry => /\.m?js(?:[?#]|$)/i.test(entry.name))
      .map(entry => entry.name)
  );
  if (homepageJsRequests.length) throw new Error("Homepage downloaded JavaScript resources: " + homepageJsRequests.join(", "));

  // Search and category filters are handled by the generated static shell.
  const search = page.getByRole("searchbox", { name: "포스트 검색" });
  const firstTitle = await page.locator(".post-item__title").first().textContent();
  const searchTerm = firstTitle?.trim().split(/\s+/)[0];
  if (!searchTerm) throw new Error("Could not find a post title for search verification");
  await search.fill(searchTerm);
  if (await page.locator(".post-item:visible").count() === 0) throw new Error("Static homepage search did not find a matching title");
  await search.fill("__no_matching_post_query__");
  if (await page.locator("[data-posts-empty]").textContent() !== "검색 결과가 없습니다.") {
    throw new Error("Static homepage search empty state was not displayed");
  }
  await search.fill("");

  // Category controls live in the desktop sidebar; switch viewport before interacting with them.
  await page.setViewportSize({ width: 1280, height: 900 });
  const category = page.locator("[data-category]").nth(1);
  const categoryName = (await category.locator(".sidebar-item__label").textContent())?.trim();
  await category.click();
  if (await page.locator(".blog-list__header h2").textContent() !== categoryName) {
    throw new Error("Static category heading did not update");
  }
  const categoryTitle = await page.locator(".post-item:visible .post-item__title").first().textContent();
  const categoryTerm = categoryTitle?.trim().split(/\s+/)[0];
  if (!categoryTerm) throw new Error("Could not find a post in the selected category");
  await search.fill(categoryTerm);
  const combinedResults = page.locator(".post-item:visible");
  if (await combinedResults.count() === 0) throw new Error("Static category and search filters returned no matching post");
  const combinedCategories = await combinedResults.evaluateAll(items =>
    [...new Set(items.map(item => item.getAttribute("data-post-category")))]
  );
  if (combinedCategories.some(value => value !== categoryName)) {
    throw new Error("Combined static filters displayed unrelated categories");
  }
  await search.fill("");
  await page.locator("[data-category]").first().click();
  await page.setViewportSize({ width: 390, height: 844 });

  // Theme and mobile navigation must remain functional without React.
  const themeButton = page.locator("[data-theme-toggle]");
  await themeButton.click();
  if (await page.locator("html").getAttribute("data-theme") !== "dark") throw new Error("Dark theme toggle failed");
  await themeButton.click();
  if (await page.locator("html").getAttribute("data-theme") !== "light") throw new Error("Light theme toggle failed");

  const menu = page.locator("[data-sidebar-toggle]");
  const sidebar = page.locator(".blog-sidebar");
  const categoryButtons = page.locator("[data-category]");
  if (await menu.getAttribute("aria-expanded") !== "false") throw new Error("Mobile menu initial expanded state is incorrect");
  if (await sidebar.getAttribute("aria-hidden") !== "true" || !(await sidebar.evaluate(el => el.inert))) {
    throw new Error("Closed mobile sidebar remains exposed to assistive technology or keyboard focus");
  }
  await menu.click();
  if (!await sidebar.evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Mobile category menu did not open");
  }
  if (await menu.getAttribute("aria-expanded") !== "true" || await sidebar.getAttribute("aria-hidden") !== "false" || await sidebar.evaluate(el => el.inert)) {
    throw new Error("Open mobile sidebar accessibility state is incorrect");
  }
  await page.waitForFunction(() => document.activeElement?.matches("[data-category]"));
  const firstCategory = categoryButtons.first();
  const lastCategory = categoryButtons.last();
  await firstCategory.focus();
  await page.keyboard.press("Shift+Tab");
  if (!(await lastCategory.evaluate(el => el === document.activeElement))) throw new Error("Mobile sidebar reverse tab did not wrap to the last category");
  await page.keyboard.press("Tab");
  if (!(await firstCategory.evaluate(el => el === document.activeElement))) throw new Error("Mobile sidebar tab did not wrap to the first category");
  await page.keyboard.press("Escape");
  if (await sidebar.evaluate(el => el.classList.contains("blog-sidebar--open"))) throw new Error("Escape did not close the mobile category menu");
  if (await menu.getAttribute("aria-expanded") !== "false" || !(await sidebar.evaluate(el => el.inert))) {
    throw new Error("Closed mobile sidebar accessibility state was not restored");
  }
  if (!(await menu.evaluate(el => el === document.activeElement))) throw new Error("Closing the mobile sidebar did not restore focus to the menu button");
  await menu.click();
  await page.locator("[data-sidebar-backdrop]").click({ position: { x: 350, y: 700 } });
  if (await sidebar.evaluate(el => el.classList.contains("blog-sidebar--open"))) {
    throw new Error("Mobile category menu did not close from backdrop");
  }
  if (!(await menu.evaluate(el => el === document.activeElement))) throw new Error("Backdrop close did not restore focus to the menu button");

  // Static article links must work as direct entries and after refresh.
  const firstPost = page.locator(".post-item:visible").first();
  await firstPost.click();
  await page.waitForURL(/\/post\/[^/]+\//);
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Article navigation did not render static content");
  if (await page.locator("h1").count() !== 1) throw new Error("Article does not have exactly one H1");
  if (await page.locator('script[src*="/assets/"], script[type="module"], link[rel="modulepreload"]').count() !== 0) {
    throw new Error("Static article unexpectedly references an application JavaScript bundle");
  }
  const articleCanonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  if (!articleCanonical?.startsWith("https://hyunjss.github.io/azzzhBlog/post/")) {
    throw new Error("Static article canonical URL does not match its route");
  }
  await page.reload({ waitUntil: "networkidle" });
  if (await page.locator(".markdown-body").count() !== 1) throw new Error("Static article failed after refresh");

  // Article pages retain category/search controls and About navigation.
  await page.setViewportSize({ width: 1280, height: 900 });
  const articleSearch = page.getByRole("searchbox", { name: "포스트 검색" });
  await articleSearch.fill("__no_matching_post_query__");
  if (await page.locator("[data-posts-empty]").textContent() !== "검색 결과가 없습니다.") {
    throw new Error("Static article search empty state was not displayed");
  }
  await articleSearch.fill("");
  const aboutLink = page.locator('.titlebar__actions a[href="/azzzhBlog/about/"]');
  await aboutLink.click();
  await page.waitForURL(base + "about/");
  if (await page.locator(".about h1").count() !== 1) throw new Error("About page content did not render");
  if (await page.title() !== "About | azzzhBlog") throw new Error("About page title is incorrect");
  if (await page.locator('link[rel="canonical"]').getAttribute("href") !== "https://hyunjss.github.io/azzzhBlog/about/") {
    throw new Error("About page canonical URL is incorrect");
  }
  if (await page.locator('script[src], script[type="module"], link[rel="modulepreload"]').count() !== 0) {
    throw new Error("Static About page unexpectedly references a JavaScript bundle");
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
  if (await page.locator(".blog-sidebar").isHidden()) throw new Error("Desktop sidebar is hidden");
  if (errors.length) throw new Error("Browser runtime errors: " + errors.join("; "));
  console.log("Browser smoke tests passed: zero homepage JS requests, static search/category filtering, theme, mobile menu, article direct entry/refresh, About direct entry/refresh, GitHub Pages links, desktop layout.");
} finally {
  await browser.close();
}
