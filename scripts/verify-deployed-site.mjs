const publicSite = "https://hyunjss.github.io/azzzhBlog";
const site = (process.env.SITE_URL || publicSite).replace(/\/$/, "");
const maxAttempts = 12;
const retryDelayMs = 5000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPublished(path, validateBody = () => true) {
  const url = site + path;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "azzzhBlog-deployment-smoke-test" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });

      if (response.ok) {
        const body = await response.text();
        if (validateBody(body)) return { response, body };
        lastError = new Error(url + " returned an unexpected response body.");
      } else {
        lastError = new Error(url + " returned HTTP " + response.status);
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      console.log("Waiting for Pages propagation (" + attempt + "/" + maxAttempts + "): " + url);
      await sleep(retryDelayMs);
    }
  }

  throw new Error("Could not verify " + url + " after " + maxAttempts + " attempts: " + lastError);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expectedCommit = process.env.GITHUB_SHA;
if (expectedCommit) {
  const deployment = await fetchPublished("/deployment-info.json", body => {
    try {
      return JSON.parse(body).commit === expectedCommit;
    } catch {
      return false;
    }
  });
  console.log("Verified deployed commit " + JSON.parse(deployment.body).commit);
}

const checks = [
  ["/", "homepage"],
  ["/feed.xml", "RSS feed"],
  ["/sitemap.xml", "sitemap"],
  ["/robots.txt", "robots.txt"],
  ["/about/", "About page"],
];

const results = new Map();
for (const [path, label] of checks) {
  const result = await fetchPublished(path);
  results.set(path, result);
  console.log("HTTP " + result.response.status + " " + label + ": " + result.response.url);
}

const home = results.get("/");
const feed = results.get("/feed.xml");
const sitemap = results.get("/sitemap.xml");
const robots = results.get("/robots.txt");
const about = results.get("/about/");

assert(home.body.includes("<title>azzzhBlog</title>"), "Homepage title is missing.");
assert(feed.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "RSS XML declaration is missing.");
assert(feed.body.includes('<rss version="2.0"'), "RSS 2.0 root element is missing.");
assert(feed.body.includes(publicSite + "/feed.xml"), "RSS self URL is missing.");
assert(sitemap.body.includes("<urlset"), "Sitemap urlset is missing.");
assert(robots.body.includes("Sitemap: " + publicSite + "/sitemap.xml"), "robots.txt sitemap directive is missing.");
assert(about.body.includes('<link rel="canonical" href="' + site + '/about/"'), "About canonical URL is missing.");

const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const articleUrls = sitemapUrls.filter(url => /\/post\/[^/]+\/$/.test(url));
assert(articleUrls.length > 0, "Sitemap does not contain any article URLs.");

const rssItems = [...feed.body.matchAll(/<item>[\s\S]*?<\/item>/g)];
assert(rssItems.length === articleUrls.length,
  "RSS item count (" + rssItems.length + ") does not match sitemap article count (" + articleUrls.length + ").");

const sampleArticleUrl = articleUrls[0];
const sitePath = new URL(site).pathname.replace(/\/$/, "");
const sampleArticlePath = new URL(sampleArticleUrl).pathname.slice(sitePath.length);
const article = await fetchPublished(sampleArticlePath);
const expectedCanonical = '<link rel="canonical" href="' + sampleArticleUrl + '"';
assert(article.body.includes(expectedCanonical), "Article canonical URL does not match sitemap: " + sampleArticleUrl);
assert(article.body.includes('rel="alternate" type="application/rss+xml"'), "Article RSS autodiscovery link is missing.");
assert(article.body.includes('"@type":"BlogPosting"'), "Article BlogPosting JSON-LD is missing.");

assert(home.body.includes('rel="alternate" type="application/rss+xml"'), "Homepage RSS autodiscovery link is missing.");
assert(about.body.includes('rel="alternate" type="application/rss+xml"'), "About RSS autodiscovery link is missing.");

console.log("Verified " + checks.length + " published endpoints and one article page.");
console.log("Verified " + articleUrls.length + " sitemap article URLs and matching RSS items.");
console.log("Production smoke test passed.");
