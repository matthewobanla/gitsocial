import { NextRequest, NextResponse } from 'next/server';
import { BufferClient } from '@/lib/buffer/client';
import { getBufferToken } from '@/lib/session';

export async function POST(request: NextRequest) {
  const token = await getBufferToken();

  if (!token) {
    return NextResponse.json(
      { error: 'You are not connected to Buffer. Please connect your Buffer account.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { channelIds, text, mediaUrl, saveToDraft = true, scheduledAt } = body;

    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one social channel.' }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Post text cannot be empty.' }, { status: 400 });
    }

    const client = new BufferClient(token);
    const results = [];

    for (const channelId of channelIds) {
      const res = await client.createPost({
        channelId,
        text,
        mediaUrls: mediaUrl ? [mediaUrl] : undefined,
        saveToDraft,
        scheduledAt,
      });
      results.push(res);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      posts: results,
      mode: saveToDraft ? 'draft' : 'scheduled',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to publish to Buffer';
    console.error('Buffer publish error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
