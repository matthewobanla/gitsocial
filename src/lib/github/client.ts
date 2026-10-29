export interface GitHubReleaseItem {
  id: number;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  highlights: string[];
  features: string[];
  fixes: string[];
}

export interface GitHubRepoSummary {
  owner: string;
  repo: string;
  description?: string;
  stars?: number;
  releases: GitHubReleaseItem[];
}

interface RawGitHubRelease {
  id: number;
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  author?: {
    login?: string;
    avatar_url?: string;
  };
}

interface RawGitHubCommit {
  sha: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      date?: string;
    };
  };
  html_url: string;
  author?: {
    login?: string;
    avatar_url?: string;
  };
}

/**
 * Parses markdown release notes into clean categories and punchy bullet points
 */
export function parseReleaseNotes(body: string): { highlights: string[]; features: string[]; fixes: string[] } {
  const lines = body.split('\n');
  const highlights: string[] = [];
  const features: string[] = [];
  const fixes: string[] = [];

  let currentCategory = 'features';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (lower.includes('fix') || lower.includes('bug')) {
      currentCategory = 'fixes';
      continue;
    } else if (lower.includes('feature') || lower.includes('new') || lower.includes('what\'s changed')) {
      currentCategory = 'features';
      continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ') || /^\d+\.\s/.test(line)) {
      const cleanText = line
        .replace(/^[\*\-•\d\.]+\s*/, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\([0-9a-f]{7,40}\)/gi, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .trim();

      if (cleanText.length > 5) {
        if (currentCategory === 'fixes') {
          fixes.push(cleanText);
        } else {
          features.push(cleanText);
        }
        highlights.push(cleanText);
      }
    }
  }

  if (highlights.length === 0 && body.trim()) {
    const sentences = body
      .replace(/[\r\n]+/g, ' ')
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && !s.startsWith('#'));
    highlights.push(...sentences.slice(0, 5));
    features.push(...sentences.slice(0, 5));
  }

  return { highlights, features, fixes };
}

/**
 * Fetches releases from GitHub API, falling back to recent commits if no releases exist
 */
export async function fetchGitHubReleases(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepoSummary> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitSocial-App',
  };

  if (token || process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${token || process.env.GITHUB_TOKEN}`;
  }

  // 1. Fetch repo metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  let description = '';
  let stars = 0;
  if (repoRes.ok) {
    const repoData = await repoRes.json();
    description = repoData.description || '';
    stars = repoData.stargazers_count || 0;
  }

  // 2. Fetch releases
  const releasesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`, { headers });
  let rawReleases: RawGitHubRelease[] = [];

  if (releasesRes.ok) {
    const json = await releasesRes.json();
    if (Array.isArray(json)) {
      rawReleases = json;
    }
  }

  // Fallback: If repo has no official GitHub releases, create a synthetic release from recent commits
  if (rawReleases.length === 0) {
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=6`, { headers });
    if (commitsRes.ok) {
      const rawCommits = (await commitsRes.json()) as RawGitHubCommit[];
      if (Array.isArray(rawCommits) && rawCommits.length > 0) {
        const commitBullets = rawCommits
          .map((c) => c.commit.message.split('\n')[0].trim())
          .filter((msg) => msg.length > 5 && !msg.startsWith('Merge '));

        const syntheticBody = commitBullets.map((b) => `- ${b}`).join('\n');
        const parsed = parseReleaseNotes(syntheticBody);

        return {
          owner,
          repo,
          description,
          stars,
          releases: [
            {
              id: 1,
              tagName: 'latest-build',
              name: `Latest Updates (${new Date().toLocaleDateString()})`,
              body: syntheticBody,
              htmlUrl: `https://github.com/repos/${owner}/${repo}`,
              publishedAt: rawCommits[0]?.commit.author?.date || new Date().toISOString(),
              author: {
                login: rawCommits[0]?.author?.login || owner,
                avatarUrl: rawCommits[0]?.author?.avatar_url || 'https://github.com/identicons/app.png',
              },
              highlights: parsed.highlights.length > 0 ? parsed.highlights : commitBullets.slice(0, 4),
              features: parsed.features.length > 0 ? parsed.features : commitBullets.slice(0, 4),
              fixes: parsed.fixes,
            },
          ],
        };
      }
    }
  }

  const releases: GitHubReleaseItem[] = rawReleases.map((r) => {
    const parsed = parseReleaseNotes(r.body || '');
    return {
      id: r.id,
      tagName: r.tag_name || 'v1.0.0',
      name: r.name || r.tag_name || 'Release',
      body: r.body || '',
      htmlUrl: r.html_url,
      publishedAt: r.published_at || new Date().toISOString(),
      author: {
        login: r.author?.login || owner,
        avatarUrl: r.author?.avatar_url || 'https://github.com/identicons/app.png',
      },
      highlights: parsed.highlights,
      features: parsed.features,
      fixes: parsed.fixes,
    };
  });

  return {
    owner,
    repo,
    description,
    stars,
    releases,
  };
}
