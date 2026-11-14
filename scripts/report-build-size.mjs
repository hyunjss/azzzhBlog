import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function files(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path, ext) : entry.isFile() && path.endsWith(ext) ? [path] : [];
  });
}

function total(paths) {
  return paths.reduce((sum, path) => sum + statSync(path).size, 0);
}

function gzipTotal(paths) {
  return paths.reduce((sum, path) => sum + gzipSync(readFileSync(path)).length, 0);
}

function summary(label, dist) {
  const js = files(join(dist, "assets"), ".js");
  const css = files(join(dist, "assets"), ".css");
  return {
    label,
    js: total(js),
    css: total(css),
    jsCount: js.length,
    cssCount: css.length,
    home: statSync(join(dist, "index.html")).size,
  };
}

function collectStaticImports(manifest, key, collected = new Set()) {
  if (!key || collected.has(key) || !manifest[key]) return collected;
  collected.add(key);
  for (const importedKey of manifest[key].imports ?? []) {
    collectStaticImports(manifest, importedKey, collected);
  }
  return collected;
}

function homepageReferencedJs(dist) {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const references = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi)]
    .map((match) => match[1]);
  return [...new Set(references)]
    .map((reference) => {
      const pathname = new URL(reference, "https://azzzhblog.local").pathname;
      const relativePath = pathname.replace(/^\/azzzhBlog\//, "").replace(/^\/+/, "");
      return join(dist, relativePath);
    })
    .filter(existsSync);
}

function analyzeInitialGraph(dist) {
  const manifestPath = join(dist, ".vite", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = Object.entries(manifest).find(([key, chunk]) =>
    chunk.isEntry && (key === "index.html" || chunk.file?.endsWith(".js")),
  );

  if (!entry) throw new Error("Could not find the application entry in the Vite manifest.");

  const [entryKey] = entry;
  const initialKeys = collectStaticImports(manifest, entryKey);
  const dynamicKeys = new Set();

  for (const key of initialKeys) {
    for (const dynamicKey of manifest[key].dynamicImports ?? []) {
      collectStaticImports(manifest, dynamicKey, dynamicKeys);
    }
  }

  for (const key of initialKeys) dynamicKeys.delete(key);

  const initialJs = [...initialKeys]
    .map((key) => manifest[key].file)
    .filter((file) => file?.endsWith(".js"))
    .map((file) => join(dist, file));
  const initialCss = [...new Set([...initialKeys].flatMap((key) => manifest[key].css ?? []))]
    .map((file) => join(dist, file));
  const lazyJs = [...dynamicKeys]
    .map((key) => manifest[key].file)
    .filter((file) => file?.endsWith(".js"))
    .map((file) => join(dist, file));
  const lazyCss = [...new Set([...dynamicKeys].flatMap((key) => manifest[key].css ?? []))]
    .filter((file) => !initialCss.includes(join(dist, file)))
    .map((file) => join(dist, file));

  return {
    entry: entryKey,
    initialJs,
    initialCss,
    lazyJs,
    lazyCss,
    initialModules: initialKeys.size,
    lazyModules: dynamicKeys.size,
  };
}

const [baseDir, currentDir] = process.argv.slice(2);
if (!baseDir || !currentDir) {
  throw new Error("Usage: node scripts/report-build-size.mjs <main-dist> <feature-dist>");
}

const base = summary("main", baseDir);
const current = summary("feature", currentDir);
const article = files(join(currentDir, "post"), "index.html")[0];
const graph = analyzeInitialGraph(currentDir);
const homepageJs = homepageReferencedJs(currentDir);

const lines = [
  "## Build output comparison",
  "",
  "| Metric | main baseline | feature build | Change |",
  "|---|---:|---:|---:|",
  "| JS assets (total) | " + base.js + " B | " + current.js + " B | " + (current.js - base.js) + " B |",
  "| CSS assets (total) | " + base.css + " B | " + current.css + " B | " + (current.css - base.css) + " B |",
  "| Homepage HTML | " + base.home + " B | " + current.home + " B | " + (current.home - base.home) + " B |",
  "| Representative article HTML | — | " + (article ? statSync(article).size : 0) + " B | standalone document; no React JS entry |",
  "",
  "## Feature initial-load graph",
  "",
  "| Metric | Raw size | Gzip size |",
  "|---|---:|---:|",
  "| Vite app entry JS (static import closure) | " + total(graph.initialJs) + " B | " + gzipTotal(graph.initialJs) + " B |",
  "| Homepage-referenced JS (script/modulepreload) | " + total(homepageJs) + " B | " + gzipTotal(homepageJs) + " B |",
  "| Initial CSS | " + total(graph.initialCss) + " B | " + gzipTotal(graph.initialCss) + " B |",
  "| Lazy JS (dynamic import closure) | " + total(graph.lazyJs) + " B | " + gzipTotal(graph.lazyJs) + " B |",
  "| Lazy CSS | " + total(graph.lazyCss) + " B | " + gzipTotal(graph.lazyCss) + " B |",
  "",
  "- Entry: `" + graph.entry + "`",
  "- Initial modules: " + graph.initialModules,
  "- Lazy modules: " + graph.lazyModules,
  "- Initial JS files: " + (graph.initialJs.map((path) => path.replace(currentDir + "/", "")).join(", ") || "none"),
  "- Lazy JS files: " + (graph.lazyJs.map((path) => path.replace(currentDir + "/", "")).join(", ") || "none"),
  "",
  "- Homepage-referenced JS is derived from actual script src and modulepreload href references in generated index.html; inline script bytes are included in Homepage HTML.",
  "",
  "_Sizes are build artifact measurements; gzip values are calculated locally from emitted files and do not represent browser transfer timings._",
];

const output = lines.join("\n");
console.log(output);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, output + "\n", { flag: "a" });
}
