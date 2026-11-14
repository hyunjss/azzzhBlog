import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = "https://hyunjss.github.io/azzzhBlog";
const siteName = "azzzhBlog";
const description = "프론트엔드 개발 경험과 AI Skill, AI 활용 프로젝트를 기록하는 기술 블로그";
const metadataPath = join(root, "src", "generated", "posts-meta.json");
const posts = JSON.parse(readFileSync(metadataPath, "utf8"));

const escapeXml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[char]);

function publicationDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? ""
    : date.toUTCString();
}

const items = posts.map(post => {
  const url = site + "/post/" + encodeURIComponent(post.slug) + "/";
  const pubDate = publicationDate(post.date);
  return [
    "<item>",
    "<title>" + escapeXml(post.title) + "</title>",
    "<link>" + escapeXml(url) + "</link>",
    '<guid isPermaLink="true">' + escapeXml(url) + "</guid>",
    "<description>" + escapeXml(post.description) + "</description>",
    post.category ? "<category>" + escapeXml(post.category) + "</category>" : "",
    pubDate ? "<pubDate>" + pubDate + "</pubDate>" : "",
    "</item>",
  ].filter(Boolean).join("\n");
}).join("\n");

const datedPosts = posts.filter(post => publicationDate(post.date));
const latestDate = datedPosts[0] ? publicationDate(datedPosts[0].date) : "";
const feed = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  "<channel>",
  "<title>" + escapeXml(siteName) + "</title>",
  "<link>" + escapeXml(site + "/") + "</link>",
  "<description>" + escapeXml(description) + "</description>",
  "<language>ko</language>",
  '<atom:link href="' + escapeXml(site + "/feed.xml") + '" rel="self" type="application/rss+xml" />',
  latestDate ? "<lastBuildDate>" + latestDate + "</lastBuildDate>" : "",
  items,
  "</channel>",
  "</rss>",
].filter(Boolean).join("\n") + "\n";

writeFileSync(join(root, "dist", "feed.xml"), feed, "utf8");
console.log("Generated RSS 2.0 feed with " + posts.length + " posts.");
