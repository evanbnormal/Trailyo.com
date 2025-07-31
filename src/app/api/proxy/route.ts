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
    console.log('🔍 Attempting to fetch thumbnail for URL:', url);
    
    // Try Microlink API for metadata extraction (NO screenshot initially, just content extraction)
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true&palette=true`;
    
    const headers: Record<string, string> = {};
    if (process.env.MICROLINK_API_KEY) {
      headers['x-api-key'] = process.env.MICROLINK_API_KEY;
    }
    
    const microlinkRes = await fetch(microlinkUrl, { headers });

    if (!microlinkRes.ok) {
      console.log('❌ Microlink API failed, status:', microlinkRes.status);
      throw new Error(`Failed to fetch from Microlink API: ${microlinkRes.status}`);
    }

    // Parse JSON response for metadata (no direct images since we're not requesting screenshots)
    const microlinkData = await microlinkRes.json();
    console.log('📄 Microlink response:', JSON.stringify(microlinkData, null, 2));
    
    // Check if there's an embedded video first
    const videoUrl = microlinkData.data?.video?.url;
    if (videoUrl) {
      console.log('🎥 Found embedded video:', videoUrl);
      return NextResponse.json({ 
        type: 'video',
        videoUrl,
        title: microlinkData.data?.title,
        description: microlinkData.data?.description
      });
    }
    
    // Also check for YouTube embeds in the page content and URLs
    const pageContent = microlinkData.data?.html || '';
    const pageUrl = microlinkData.data?.url || url;
    
    // Check for various YouTube patterns
    const youtubePatterns = [
      /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/
    ];
    
    // Check page content first
    for (const pattern of youtubePatterns) {
      const match = pageContent.match(pattern);
      if (match) {
        const videoId = match[1];
        console.log('🎥 Found YouTube embed in page content:', videoId);
        return NextResponse.json({ 
          type: 'video',
          videoUrl: `https://www.youtube.com/embed/${videoId}`,
          title: microlinkData.data?.title || 'YouTube Video',
          description: microlinkData.data?.description
        });
      }
    }
    
    // Check if the main URL itself is a YouTube URL
    for (const pattern of youtubePatterns) {
      const match = pageUrl.match(pattern);
      if (match) {
        const videoId = match[1];
        console.log('🎥 Found YouTube URL:', videoId);
        return NextResponse.json({ 
          type: 'video',
          videoUrl: `https://www.youtube.com/embed/${videoId}`,
          title: microlinkData.data?.title || 'YouTube Video',
          description: microlinkData.data?.description
        });
      }
    }
    
    // Try multiple image sources in order of preference (NO screenshots, only actual content)
    const imageUrl = microlinkData.data?.image?.url || 
                    microlinkData.data?.image ||
                    microlinkData.data?.logo?.url ||
                    microlinkData.data?.logo;

    if (!imageUrl) {
      console.log('❌ No content image found, trying screenshot as fallback');
      
      // Try screenshot as absolute fallback
      const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
      
      try {
        const screenshotRes = await fetch(screenshotUrl, { headers });
        if (screenshotRes.ok) {
          const screenshotData = await screenshotRes.json();
          const fallbackImageUrl = screenshotData.data?.screenshot?.url;
          
          if (fallbackImageUrl) {
            console.log('📸 Using screenshot as fallback:', fallbackImageUrl);
            const imageRes = await fetch(fallbackImageUrl);
            
            if (imageRes.ok) {
              const imageBuffer = await imageRes.arrayBuffer();
              const finalContentType = imageRes.headers.get('content-type') || 'image/jpeg';
              
              return new NextResponse(imageBuffer, {
                headers: {
                  'Content-Type': finalContentType,
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          }
        }
      } catch (screenshotError) {
        console.log('❌ Screenshot fallback also failed:', screenshotError);
      }
      
      return NextResponse.json({ error: 'No image found' }, { status: 404 });
    }

    console.log('🖼️ Found image URL:', imageUrl);
    console.log('📊 Available content sources:', {
      imageUrl: microlinkData.data?.image?.url,
      imageValue: microlinkData.data?.image,
      logoUrl: microlinkData.data?.logo?.url,
      logoValue: microlinkData.data?.logo,
      videoUrl: microlinkData.data?.video?.url,
      title: microlinkData.data?.title
    });

    const imageRes = await fetch(imageUrl);
    
    if (!imageRes.ok) {
      console.log('❌ Failed to fetch image, status:', imageRes.status);
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const finalContentType = imageRes.headers.get('content-type') || 'image/jpeg';

    console.log('✅ Successfully fetched image, size:', imageBuffer.byteLength, 'bytes');

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': finalContentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json({ 
      error: 'Error fetching preview', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 