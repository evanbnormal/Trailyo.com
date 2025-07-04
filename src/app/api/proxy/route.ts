import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    
    const microlinkRes = await fetch(microlinkUrl, {
      headers: { 
        'x-api-key': process.env.MICROLINK_API_KEY || '' 
      },
    });

    if (!microlinkRes.ok) {
      throw new Error('Failed to fetch from Microlink API');
    }

    const microlinkData = await microlinkRes.json();
    const imageUrl = microlinkData.data?.image?.url || microlinkData.data?.logo?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image found' }, { status: 404 });
    }

    const imageRes = await fetch(imageUrl);
    
    if (!imageRes.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Error fetching preview' }, { status: 500 });
  }
} 