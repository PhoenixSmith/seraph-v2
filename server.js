import { serve } from 'bun';
import { serveFile } from 'bun';

Bun.serve({
  port: 8080,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    
    try {
      return await serveFile(req, `/home/workspace/coding_projects/seraph-v2/dist${filePath}`);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  },
});

console.log('Static file server running on http://0.0.0.0:8080/');

