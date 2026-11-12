import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
function files(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path, ext) : entry.isFile() && path.endsWith(ext) ? [path] : [];
  });
}
function total(paths) { return paths.reduce((sum, path) => sum + statSync(path).size, 0); }
function summary(label, dist) {
  const js = files(join(dist, "assets"), ".js");
  const css = files(join(dist, "assets"), ".css");
  return { label, js: total(js), css: total(css), jsCount: js.length, cssCount: css.length, home: statSync(join(dist, "index.html")).size };
}
const [baseDir, currentDir] = process.argv.slice(2);
const base = summary("main", baseDir);
const current = summary("feature", currentDir);
const article = files(join(currentDir, "post"), "index.html")[0];
const lines = [
  "| Metric | main baseline | feature build | Change |",
  "|---|---:|---:|---:|",
  "| JS assets (total) | " + base.js + " B | " + current.js + " B | " + (current.js - base.js) + " B |",
  "| CSS assets (total) | " + base.css + " B | " + current.css + " B | " + (current.css - base.css) + " B |",
  "| Homepage HTML | " + base.home + " B | " + current.home + " B | " + (current.home - base.home) + " B |",
  "| Representative article HTML | — | " + (article ? statSync(article).size : 0) + " B | standalone document; no React JS entry |",
];
const output = lines.join("\\n");
console.log(output);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, output + "\\n", { flag: "a" });
