// Builds the one-file game: inlines every stylesheet and script used by source/index.html
// (game code, house data, Leaflet and PeerJS) into a single index.html in the main folder.
// Usage (from the main folder):  node source/tools/build-single.js
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..");
const OUT = path.resolve(SRC, "..", "index.html");

const read = (rel) => {
  const file = path.join(SRC, rel);
  if (!fs.existsSync(file)) throw new Error("Missing file referenced by source/index.html: " + rel);
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "");
};
// keep the browser from treating text inside the code as the end of the tag, and drop source-map hints
const safeJs = (s) => s.replace(/^\/\/# sourceMappingURL=.*$/gm, "").replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const safeCss = (s) => s.replace(/\/\*# sourceMappingURL=.*?\*\//g, "").replace(/<\/style/gi, "<\\/style");

let html = read("index.html");
let inlined = 0;

html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g, (m, href) => {
  inlined++;
  return `<style data-from="${href}">\n${safeCss(read(href))}\n</style>`;
});
html = html.replace(/<script src="(?!https?:)([^"]+)"><\/script>/g, (m, src) => {
  inlined++;
  return `<script data-from="${src}">\n${safeJs(read(src))}\n</script>`;
});

const leftovers = html.match(/<(script|link)[^>]+(src|href)="(?!https?:|data:)[^"]+"/g);
if (leftovers) throw new Error("Some local files were not inlined: " + leftovers.join(", "));

const stamp = new Date().toISOString().slice(0, 10);
html = html.replace("<!doctype html>", `<!doctype html>\n<!-- House Hunters - The Game: the whole game in one file (built ${stamp}).\n     To change the game, edit the files in the "source" folder, then run:  node source/tools/build-single.js -->`);

fs.writeFileSync(OUT, html);
console.log(`Built ${path.relative(process.cwd(), OUT) || OUT}: ${inlined} files inlined, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
