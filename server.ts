import { serve } from "bun";

const port = 8080;
const host = "0.0.0.0";

serve({
  port,
  hostname: host,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") {
      path = "/index.html";
    }

    const filePath = import.meta.dir + "/dist" + path;
    
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();
      
      if (!exists) {
        return new Response("Not Found", { status: 404 });
      }

      return new Response(file);
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`Server running at http://${host}:${port}/`);


