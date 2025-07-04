import 'dotenv/config';
import axios from 'axios';

console.log('[Proxy] Starting Bun server...');

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // Basic CORS preflight handling
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    }

    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      console.log(`[Proxy] Received request for: ${targetUrl}`);

      if (!targetUrl) {
        console.log('[Proxy] Error: URL parameter is missing.');
        return new Response('URL is required', { status: 400 });
      }

      try {
        const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`;
        console.log(`[Proxy] Calling Microlink API: ${microlinkUrl}`);

        const microlinkRes = await axios.get(microlinkUrl, {
          headers: { 'x-api-key': process.env.MICROLINK_API_KEY },
        });

        const imageUrl = microlinkRes.data.data?.image?.url || microlinkRes.data.data?.logo?.url;

        if (imageUrl) {
          const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const contentType = imageRes.headers['content-type'];
          
          return new Response(imageRes.data, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': contentType,
            },
          });
        } else {
          return new Response('No image found', { status: 404 });
        }
      } catch (error) {
        console.error('[Proxy] Error:', error.message);
        return new Response('Error fetching preview', { status: 500 });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  },
  error(error) {
    console.error('[Proxy] Server Error:', error);
    return new Response(null, { status: 500 });
  },
});

console.log('[Proxy] Server running at http://localhost:3001'); 