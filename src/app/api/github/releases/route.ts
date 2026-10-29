import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubReleases } from '@/lib/github/client';
import { generateSocialPosts, PostTone } from '@/lib/generator/postGenerator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner') || 'bufferapp';
  const repo = searchParams.get('repo') || 'buffer-sample-apps';
  const tone = (searchParams.get('tone') as PostTone) || 'punchy';

  try {
    const repoSummary = await fetchGitHubReleases(owner, repo);

    // If releases exist, generate post bundles for each release
    const releasesWithBundles = repoSummary.releases.map((rel) => {
      const bundle = generateSocialPosts(owner, repo, rel, tone);
      return {
        ...rel,
        bundle,
      };
    });

    return NextResponse.json({
      success: true,
      repoSummary: {
        ...repoSummary,
        releases: releasesWithBundles,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch GitHub releases';
    console.error('Failed to fetch GitHub releases:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
