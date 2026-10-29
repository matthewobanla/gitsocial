import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">Privacy Policy for GitSocial</h1>
      <p className="text-sm text-slate-400">Last updated: October 29, 2026</p>

      <section className="space-y-3 text-slate-300 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold text-white">1. Overview</h2>
        <p>
          GitSocial is a developer tool designed to bridge GitHub changelogs, tags, and releases to social media
          channels via the Buffer API. We respect your privacy and only request access required to perform this
          service.
        </p>

        <h2 className="text-xl font-semibold text-white">2. Data We Access</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Buffer Account Data</strong>: When you authenticate with Buffer, we receive an OAuth token allowing
            us to fetch your connected social channels and schedule posts on your behalf.
          </li>
          <li>
            <strong>GitHub Repository Data</strong>: We access publicly available release notes, tags, and commit
            summaries for repositories you specify to generate social media announcements.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-white">3. How Data is Used & Stored</h2>
        <p>
          GitSocial does not sell, lease, or share your data with any third parties. Access tokens are stored in secure,
          encrypted HTTP-only cookies on your browser session and are never transmitted to unauthorized parties.
        </p>

        <h2 className="text-xl font-semibold text-white">4. Revoking Access</h2>
        <p>
          You may disconnect your Buffer account at any time using the Disconnect button in the application or by
          revoking GitSocial&apos;s permissions from your Buffer account settings.
        </p>

        <h2 className="text-xl font-semibold text-white">5. Contact</h2>
        <p>
          For questions regarding this policy, contact the maintainer at{' '}
          <a href="https://github.com/matthewobanla" className="text-blue-400 underline">
            https://github.com/matthewobanla
          </a>
          .
        </p>
      </section>
    </div>
  );
}
