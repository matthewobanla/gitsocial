import { GitHubReleaseItem } from '../github/client';

export type SocialPlatform = 'twitter' | 'linkedin' | 'threads' | 'bluesky';
export type PostTone = 'professional' | 'indie' | 'punchy' | 'storytelling';

export interface GeneratedPostVariant {
  platform: SocialPlatform;
  text: string;
  characterCount: number;
  maxCharacters: number;
  isOverLimit: boolean;
  hashtags: string[];
}

export interface GeneratedPostBundle {
  repoName: string;
  version: string;
  releaseTitle: string;
  variants: Record<SocialPlatform, GeneratedPostVariant>;
}

export function generateSocialPosts(
  owner: string,
  repo: string,
  release: GitHubReleaseItem,
  tone: PostTone = 'punchy'
): GeneratedPostBundle {
  const repoName = `${owner}/${repo}`;
  const version = release.tagName;
  const title = release.name !== version ? release.name : `Update ${version}`;
  const features = release.features.slice(0, 4);
  const fixes = release.fixes.slice(0, 2);

  // 1. Twitter / X variant (280 max)
  let twitterText = '';
  if (tone === 'indie') {
    twitterText = `🚀 Just shipped ${version} for ${repo}!\n\n`;
    if (features.length > 0) {
      twitterText += `What's new:\n${features.slice(0, 2).map((f) => `• ${f}`).join('\n')}\n\n`;
    }
    twitterText += `Full changelog: ${release.htmlUrl}\n#buildinpublic #shipfast`;
  } else if (tone === 'professional') {
    twitterText = `We are excited to announce the release of ${repoName} ${version}.\n\n`;
    if (features.length > 0) {
      twitterText += `Key improvements:\n${features.slice(0, 2).map((f) => `• ${f}`).join('\n')}\n\n`;
    }
    twitterText += `Check out the details: ${release.htmlUrl}\n#OpenSource #SoftwareEngineering`;
  } else {
    // Punchy default
    twitterText = `⚡ ${repo} ${version} is now live!\n\n`;
    if (features.length > 0) {
      twitterText += `${features.slice(0, 2).map((f) => `✨ ${f}`).join('\n')}\n\n`;
    }
    twitterText += `🔗 ${release.htmlUrl}\n#devtools #coding`;
  }

  // 2. LinkedIn variant (Long-form storytelling & professional craft)
  let linkedinText = `🚀 Exciting milestone: ${repo} ${version} is officially released!\n\n`;
  linkedinText += `Our team just pushed a major release focused on reliability and developer experience. Here is a breakdown of what changed in ${title}:\n\n`;

  if (features.length > 0) {
    linkedinText += `🌟 Key Highlights & Features:\n`;
    features.forEach((feat) => {
      linkedinText += `• ${feat}\n`;
    });
    linkedinText += `\n`;
  }

  if (fixes.length > 0) {
    linkedinText += `🛠️ Improvements & Fixes:\n`;
    fixes.forEach((fix) => {
      linkedinText += `• ${fix}\n`;
    });
    linkedinText += `\n`;
  }

  linkedinText += `You can review the full changelog and release notes on GitHub: ${release.htmlUrl}\n\n`;
  linkedinText += `Feedback and pull requests are always welcome. What feature would you like to see next?\n\n`;
  linkedinText += `#SoftwareEngineering #OpenSource #DevOps #ProductDevelopment #TechInnovation`;

  // 3. Bluesky variant (300 character limit)
  let blueskyText = `✨ ${repo} ${version} has arrived!\n\n`;
  if (features.length > 0) {
    blueskyText += `${features.slice(0, 2).map((f) => `→ ${f}`).join('\n')}\n\n`;
  }
  blueskyText += `Release notes: ${release.htmlUrl}\n#coding #buildinpublic`;

  // 4. Threads / Instagram variant (Casual & engaging)
  let threadsText = `Fresh out of CI/CD: ${repo} ${version} is out! 📦\n\n`;
  if (features.length > 0) {
    threadsText += `Top changes:\n${features.slice(0, 3).map((f) => `⚡ ${f}`).join('\n')}\n\n`;
  }
  threadsText += `Grab the update on GitHub: ${release.htmlUrl}\n\n#devs #programming #startup`;

  return {
    repoName,
    version,
    releaseTitle: title,
    variants: {
      twitter: {
        platform: 'twitter',
        text: twitterText,
        characterCount: twitterText.length,
        maxCharacters: 280,
        isOverLimit: twitterText.length > 280,
        hashtags: ['#devtools', '#buildinpublic'],
      },
      linkedin: {
        platform: 'linkedin',
        text: linkedinText,
        characterCount: linkedinText.length,
        maxCharacters: 3000,
        isOverLimit: linkedinText.length > 3000,
        hashtags: ['#SoftwareEngineering', '#OpenSource'],
      },
      bluesky: {
        platform: 'bluesky',
        text: blueskyText,
        characterCount: blueskyText.length,
        maxCharacters: 300,
        isOverLimit: blueskyText.length > 300,
        hashtags: ['#coding'],
      },
      threads: {
        platform: 'threads',
        text: threadsText,
        characterCount: threadsText.length,
        maxCharacters: 500,
        isOverLimit: threadsText.length > 500,
        hashtags: ['#programming', '#devs'],
      },
    },
  };
}
