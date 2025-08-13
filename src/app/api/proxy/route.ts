import { NextRequest, NextResponse } from 'next/server';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Function to extract YouTube video ID
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Function to check if URL is an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    console.log('🔍 Attempting to fetch content for URL:', url);
    
    // Check if it's a YouTube URL first
    const youtubeVideoId = getYouTubeVideoId(url);
    if (youtubeVideoId) {
      console.log('🎥 Found YouTube video ID:', youtubeVideoId);
      return NextResponse.json({ 
        type: 'video',
        videoUrl: `https://www.youtube.com/embed/${youtubeVideoId}`,
        title: 'YouTube Video',
        description: 'Embedded YouTube video'
      });
    }
    
    // Check if it's a direct image URL
    if (isImageUrl(url)) {
      console.log('🖼️ Direct image URL detected');
      try {
        const imageRes = await fetch(url);
        
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image: ${imageRes.status}`);
        }

        const contentType = imageRes.headers.get('content-type');
        if (!contentType?.startsWith('image/')) {
          throw new Error('URL does not point to an image');
        }

        const imageBuffer = await imageRes.arrayBuffer();
        console.log('✅ Successfully fetched image, size:', imageBuffer.byteLength, 'bytes');

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (imageError) {
        console.log('❌ Failed to fetch direct image:', imageError);
        // Continue to fallback methods
      }
    }
    
    // Try to fetch the page and look for Open Graph images
    try {
      console.log('📄 Fetching page content to look for images...');
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrailBlaze/1.0)',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!pageRes.ok) {
        throw new Error(`Failed to fetch page: ${pageRes.status}`);
      }
      
      const html = await pageRes.text();
      
      // Look for Open Graph image tags
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      
      let imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || faviconMatch?.[1];
      
      if (imageUrl) {
        // Make relative URLs absolute
        if (imageUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        } else if (imageUrl.startsWith('./')) {
          const urlObj = new URL(url);
          imageUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace(/\/[^\/]*$/, '/')}${imageUrl.slice(2)}`;
        }
        
        console.log('🖼️ Found image in page:', imageUrl);
        
        try {
          const imageRes = await fetch(imageUrl);
          
          if (imageRes.ok) {
            const contentType = imageRes.headers.get('content-type');
            if (contentType?.startsWith('image/')) {
              const imageBuffer = await imageRes.arrayBuffer();
              console.log('✅ Successfully fetched page image, size:', imageBuffer.byteLength, 'bytes');

              return new NextResponse(imageBuffer, {
                headers: {
                  'Content-Type': contentType,
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          }
        } catch (imageError) {
          console.log('❌ Failed to fetch page image:', imageError);
        }
      }
      
      // If no image found, return a simple JSON response
      console.log('❌ No suitable image found on page');
      return NextResponse.json({ 
        type: 'webpage',
        title: 'Webpage',
        description: 'No preview image available'
      });
      
    } catch (pageError) {
      console.log('❌ Failed to fetch page content:', pageError);
      return NextResponse.json({ 
        type: 'webpage',
        title: 'Webpage',
        description: 'Unable to fetch preview'
      });
    }
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json({ 
      error: 'Error fetching preview', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 