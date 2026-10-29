# GitSocial 🚀
> Automated Changelog-to-Social Studio & Webhook for Developers, Indie Hackers, and Open-Source Maintainers — Built on the **Buffer API** for **Buffer Commit 2026**.

GitSocial bridges the gap between shipping code and building in public. When you publish a release or push git tags to GitHub, GitSocial translates raw technical commits and changelog notes into engaging, platform-optimized social posts (LinkedIn, X/Twitter, Bluesky, Threads) with an auto-generated visual release card, and drafts or schedules them directly into your Buffer queues.

---

## 🌟 Key Features

1. **Interactive Release Studio**:
   - Fetch releases, tags, or recent commits from any public or private GitHub repository (`owner/repo`).
   - Choose your narrative angle: **Punchy & Direct ⚡**, **Indie Hacker / BuildInPublic 🚀**, **Professional Tech 💼**, or **Story Breakdown 📖**.
   - Real-time character counters and limit checks tailored for LinkedIn (3,000), Bluesky (300), and X (280).

2. **Automated Visual Release Card Generator (`/api/card/[releaseId]`)**:
   - The Buffer API requires media to be reachable at public URLs.
   - GitSocial generates on-the-fly, high-resolution (1200x630) OpenGraph cards featuring the repository name, release version, title, and key highlights.

3. **Buffer GraphQL Integration & OAuth 2.0 PKCE**:
   - Built to official Buffer specifications with PKCE (`code_challenge` / `code_verifier`) and rotating refresh token management.
   - Channel selector querying `channels(organizationId: $id)`.
   - Safe drafting (`saveToDraft: true`) for testing without publishing live, or direct scheduling.

4. **Zero-Touch Webhook ("Build & Forget")**:
   - Set up a GitHub webhook (`/api/webhook/github`) on `release.published`.
   - Ship code on GitHub, and your Buffer queues are automatically populated with release announcements.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS + Lucide Icons
- **Buffer API**: GraphQL API (`https://api.buffer.com`) & OAuth 2.0 PKCE
- **Dynamic OG Image**: Next.js Edge Runtime `ImageResponse`
- **GitHub Ingestion**: Octokit / GitHub REST API

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials from [Buffer Developer Portal](https://publish.buffer.com/settings/api?tab=app-clients):
```env
BUFFER_CLIENT_ID=your_buffer_app_client_id
BUFFER_CLIENT_SECRET=your_buffer_app_client_secret
BUFFER_REDIRECT_URI=https://localhost:3000/api/auth/buffer/callback
```

### 3. Run Locally with HTTPS
Buffer OAuth strictly requires HTTPS for redirect URIs (even on localhost):
```bash
# Option A: Run Next.js with local SSL certificate
pnpm dev --experimental-https

# Option B: Run standard dev and tunnel with ngrok
pnpm dev
# in another terminal:
ngrok http 3000
```
Register the corresponding URL as a redirect URI in your Buffer App Client settings.

---

## 📦 Buffer Commit Submission Checklist

- [x] Web app built with private (confidential) Buffer OAuth App Client
- [x] Mandatory PKCE implementation
- [x] Multi-platform generation and Buffer draft/schedule mutations
- [x] Dynamic visual media hosting complying with Buffer requirements
- [ ] 2-Minute demo video
- [ ] 300-Word summary
- [ ] Live public deployment URL (Vercel / Netlify / Cloudflare)
