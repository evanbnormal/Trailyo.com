import 'dotenv/config';
import axios from 'axios';

console.log('[Proxy] Starting Bun server...');

Bun.serve({
  port: 3002,
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
        // Try to fetch the webpage and look for Open Graph or Twitter meta tags
        const response = await axios.get(targetUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TrailyoBot/1.0)',
          },
        });

        const html = response.data;
        
        // Look for Open Graph image
        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        if (ogImageMatch) {
          const imageUrl = ogImageMatch[1];
          console.log(`[Proxy] Found Open Graph image: ${imageUrl}`);
          
          const imageRes = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000,
          });
          const contentType = imageRes.headers['content-type'];
          
          return new Response(imageRes.data, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': contentType,
            },
          });
        }
        
        // Look for Twitter image
        const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        if (twitterImageMatch) {
          const imageUrl = twitterImageMatch[1];
          console.log(`[Proxy] Found Twitter image: ${imageUrl}`);
          
          const imageRes = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000,
          });
          const contentType = imageRes.headers['content-type'];
          
          return new Response(imageRes.data, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': contentType,
            },
          });
        }
        
        // Look for any image in the page
        const imgMatches = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
        if (imgMatches) {
          for (const imgMatch of imgMatches) {
            const srcMatch = imgMatch.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
              let imageUrl = srcMatch[1];
              
              // Skip data URLs and very small images
              if (imageUrl.startsWith('data:') || imageUrl.includes('icon') || imageUrl.includes('logo')) {
                continue;
              }
              
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                const urlObj = new URL(targetUrl);
                imageUrl = urlObj.origin + imageUrl;
              } else if (!imageUrl.startsWith('http')) {
                const urlObj = new URL(targetUrl);
                imageUrl = urlObj.origin + '/' + imageUrl;
              }
              
              console.log(`[Proxy] Trying page image: ${imageUrl}`);
              
              try {
                const imageRes = await axios.get(imageUrl, { 
                  responseType: 'arraybuffer',
                  timeout: 5000,
                });
                const contentType = imageRes.headers['content-type'];
                
                // Check if it's actually an image and has reasonable size
                if (contentType.startsWith('image/') && imageRes.data.length > 1000) {
                  console.log(`[Proxy] Successfully fetched image: ${imageUrl} (${imageRes.data.length} bytes)`);
                  
                  return new Response(imageRes.data, {
                    headers: {
                      'Access-Control-Allow-Origin': '*',
                      'Content-Type': contentType,
                    },
                  });
                }
              } catch (imageError) {
                console.log(`[Proxy] Failed to fetch image ${imageUrl}: ${imageError.message}`);
              }
            }
          }
        }
        
        return new Response('No image found', { status: 404 });
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

console.log('[Proxy] Server running at http://localhost:3002'); 