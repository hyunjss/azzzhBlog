import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const manifestPath = join(dist, ".vite", "manifest.json");
const aboutPath = join(dist, "about", "index.html");
const base = "/azzzhBlog/";

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const aboutEntry = Object.entries(manifest).find(([key, entry]) =>
  key.endsWith("src/pages/About.tsx") ||
  entry.src?.endsWith("src/pages/About.tsx")
);

if (!aboutEntry) {
  throw new Error("Could not find the About page entry in the Vite manifest.");
}

const cssFiles = aboutEntry[1].css ?? [];
if (cssFiles.length === 0) {
  throw new Error("The About page has no emitted CSS files; check its stylesheet import.");
}

let html = readFileSync(aboutPath, "utf8");
const links = cssFiles
  .map(file => '<link rel="stylesheet" href="' + base + file + '" />')
  .join("");

if (!html.includes(links)) {
  html = html.replace("</head>", links + "</head>");
  writeFileSync(aboutPath, html);
}

for (const file of cssFiles) {
  if (!existsSync(join(dist, file))) {
    throw new Error("Emitted About stylesheet does not exist: " + file);
  }
  if (!html.includes(base + file)) {
    throw new Error("About stylesheet link missing from static HTML: " + file);
  }
}

console.log("Linked " + cssFiles.length + " About stylesheet(s) to the static About page.");
