import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ttf": "font/ttf" };
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    const path = resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    const localPath = relative(root, path);
    if (isAbsolute(localPath) || localPath.split(/[\\/]/).some((part) => part.startsWith("."))) throw new Error("Invalid path");
    const data = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Octopus Mentality: http://localhost:${port}`));
