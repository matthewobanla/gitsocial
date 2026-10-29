import { NextRequest, NextResponse } from 'next/server';
import { parseReleaseNotes } from '@/lib/github/client';
import { generateSocialPosts } from '@/lib/generator/postGenerator';
import { BufferClient } from '@/lib/buffer/client';

export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-github-event');
    const authHeader = request.headers.get('x-buffer-token');

    if (event !== 'release') {
      return NextResponse.json({ message: `Ignored event: ${event}. GitSocial handles 'release' events.` });
    }

    const payload = await request.json();
    const action = payload.action;

    if (action !== 'published') {
      return NextResponse.json({ message: `Release action '${action}' ignored. Waiting for 'published'.` });
    }

    const release = payload.release;
    const repository = payload.repository;

    if (!release || !repository) {
      return NextResponse.json({ error: 'Malformed webhook payload.' }, { status: 400 });
    }

    const owner = repository.owner?.login || 'developer';
    const repo = repository.name;

    const parsedNotes = parseReleaseNotes(release.body || '');
    const releaseItem = {
      id: release.id,
      tagName: release.tag_name || 'v1.0.0',
      name: release.name || release.tag_name,
      body: release.body || '',
      htmlUrl: release.html_url,
      publishedAt: release.published_at || new Date().toISOString(),
      author: {
        login: release.author?.login || owner,
        avatarUrl: release.author?.avatar_url || '',
      },
      highlights: parsedNotes.highlights,
      features: parsedNotes.features,
      fixes: parsedNotes.fixes,
    };

    const bundle = generateSocialPosts(owner, repo, releaseItem, 'punchy');

    // If an authorization token was supplied via header or environment, post to Buffer directly
    const bufferToken = authHeader || process.env.BUFFER_DEFAULT_TOKEN;
    if (bufferToken) {
      const client = new BufferClient(bufferToken);
      const orgs = await client.getOrganizations();
      if (orgs.length > 0) {
        const channels = await client.getChannels(orgs[0].id);
        if (channels.length > 0) {
          const postResults = [];
          for (const ch of channels) {
            const variantText =
              ch.service === 'linkedin'
                ? bundle.variants.linkedin.text
                : ch.service === 'bluesky'
                ? bundle.variants.bluesky.text
                : bundle.variants.twitter.text;

            const res = await client.createPost({
              channelId: ch.id,
              text: variantText,
              saveToDraft: true,
            });
            postResults.push(res);
          }

          return NextResponse.json({
            success: true,
            automated: true,
            draftsCreated: postResults.length,
            bundle,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      automated: false,
      message: 'Release parsed successfully. To automate direct queueing, provide x-buffer-token header.',
      bundle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('Webhook processing error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
