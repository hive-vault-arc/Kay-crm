const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const htmlPath = path.join(__dirname, "kay-data-models.html");
const server = http.createServer((request, response) => {
  if (request.url === "/" || request.url === "/kay-data-models.html") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(fs.readFileSync(htmlPath));
  } else if (request.url === "/favicon.ico") {
    response.writeHead(204);
    response.end();
  } else {
    response.writeHead(404);
    response.end();
  }
});
server.listen(43873, "127.0.0.1", () => {
  process.stdout.write("KAY diagram preview: http://127.0.0.1:43873/\n");
});
