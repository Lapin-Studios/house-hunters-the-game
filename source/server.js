// House Hunters - The Game : tiny zero-dependency static file server for development.
// You don't need this to play: just open index.html (the one-file game) in the main folder.
// Usage (from the main folder):  node source/server.js [--open]
//   http://localhost:8080/          the one-file game (index.html in the main folder)
//   http://localhost:8080/source/   the editable source version
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const START_PORT = Number(process.env.PORT) || 8080;
const ROOT = path.resolve(__dirname, "..");
const OPEN = process.argv.includes("--open");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { res.writeHead(400); return res.end("Bad request"); }
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

let port = START_PORT;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port < START_PORT + 20) {
    port++;
    server.listen(port);
  } else {
    console.error("Could not start the server:", err.message);
    process.exit(1);
  }
});
server.on("listening", () => {
  console.log(`\n  House Hunters - The Game is running!\n`);
  console.log(`  One-file game:      http://localhost:${port}/`);
  console.log(`  Source version:     http://localhost:${port}/source/`);
  Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === "IPv4" && !n.internal).forEach((n) => {
    console.log(`  Same Wi-Fi friends: http://${n.address}:${port}/`);
  });
  console.log(`\n  Press Ctrl+C to stop.\n`);
  if (OPEN) openBrowser(`http://localhost:${port}/`);
});
server.listen(port);
