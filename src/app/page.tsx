'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCommit,
  Share2,
  CheckCircle2,
  ExternalLink,
  Send,
  RefreshCw,
  Terminal,
  Copy,
  Image as ImageIcon,
  Sliders,
  AlertCircle,
  LogOut,
  Zap,
  Sparkles,
  FileCode,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { PostTone, SocialPlatform } from '@/lib/generator/postGenerator';

interface ReleaseItem {
  id: number;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  highlights: string[];
  features: string[];
  fixes: string[];
  bundle?: {
    variants: Record<
      SocialPlatform,
      {
        platform: SocialPlatform;
        text: string;
        characterCount: number;
        maxCharacters: number;
        isOverLimit: boolean;
        hashtags: string[];
      }
    >;
  };
}

interface BufferChannel {
  id: string;
  name: string;
  service: string;
  avatar?: string;
}

interface PublishResult {
  success: boolean;
  count: number;
  mode: 'draft' | 'scheduled';
}

export default function GitSocialApp() {
  // Buffer OAuth state
  const [bufferConnected, setBufferConnected] = useState<boolean>(false);
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Navigation tab
  const [currentNav, setCurrentNav] = useState<'studio' | 'webhook'>('studio');

  // GitHub State
  const [repoInput, setRepoInput] = useState<string>('bufferapp/buffer-sample-apps');
  const [loadingRepo, setLoadingRepo] = useState<boolean>(false);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number>(0);
  const [repoMeta, setRepoMeta] = useState<{ owner: string; repo: string; stars?: number }>({
    owner: 'bufferapp',
    repo: 'buffer-sample-apps',
  });

  // Post editor state (per platform)
  const [tone, setTone] = useState<PostTone>('punchy');
  const [editedPosts, setEditedPosts] = useState<Record<SocialPlatform, string>>({
    linkedin: '',
    twitter: '',
    bluesky: '',
    threads: '',
  });
  const [includeImageCard, setIncludeImageCard] = useState<boolean>(true);

  // Statuses
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

  // Fetch Releases from GitHub
  const fetchReleases = useCallback(async (owner: string, repo: string, currentTone: PostTone) => {
    setLoadingRepo(true);
    setErrorMessage('');
    setPublishResult(null);
    try {
      const res = await fetch(`/api/github/releases?owner=${owner}&repo=${repo}&tone=${currentTone}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch repository releases');
      }

      setRepoMeta({ owner, repo, stars: data.repoSummary.stars });
      const fetchedReleases: ReleaseItem[] = data.repoSummary.releases || [];
      setReleases(fetchedReleases);

      if (fetchedReleases.length > 0) {
        setSelectedReleaseIndex(0);
        const variants = fetchedReleases[0].bundle?.variants;
        if (variants) {
          setEditedPosts({
            linkedin: variants.linkedin.text,
            twitter: variants.twitter.text,
            bluesky: variants.bluesky.text,
            threads: variants.threads.text,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading repository';
      setErrorMessage(msg);
    } finally {
      setLoadingRepo(false);
    }
  }, []);

  const checkBufferAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/buffer/channels');
      const data = await res.json();
      if (data.connected && data.channels && data.channels.length > 0) {
        setBufferConnected(true);
        setChannels(data.channels);
        setSelectedChannels(data.channels.map((c: BufferChannel) => c.id));
      } else {
        setBufferConnected(false);
        const mockChannels: BufferChannel[] = [
          { id: 'mock-tw', name: 'kingmatt_MO', service: 'twitter' },
          { id: 'mock-li', name: 'Matthew Ọbàńlá', service: 'linkedin' },
          { id: 'mock-bs', name: 'kingmatt.mo', service: 'bluesky' },
          { id: 'mock-th', name: 'kingmatt.mo', service: 'threads' },
        ];
        setChannels(mockChannels);
        setSelectedChannels(mockChannels.map((c) => c.id));
      }
    } catch {
      setBufferConnected(false);
    }
  }, []);

  useEffect(() => {
    checkBufferAuth();
    fetchReleases('bufferapp', 'buffer-sample-apps', 'punchy');
  }, [checkBufferAuth, fetchReleases]);

  async function handleBufferLogout() {
    await fetch('/api/auth/buffer/logout', { method: 'POST' });
    setBufferConnected(false);
    checkBufferAuth();
  }

  const currentRelease = releases[selectedReleaseIndex];

  useEffect(() => {
    if (currentRelease?.bundle?.variants) {
      setEditedPosts({
        linkedin: currentRelease.bundle.variants.linkedin.text,
        twitter: currentRelease.bundle.variants.twitter.text,
        bluesky: currentRelease.bundle.variants.bluesky.text,
        threads: currentRelease.bundle.variants.threads.text,
      });
    }
  }, [selectedReleaseIndex, currentRelease]);

  function handleToneChange(newTone: PostTone) {
    setTone(newTone);
    if (repoMeta.owner && repoMeta.repo) {
      fetchReleases(repoMeta.owner, repoMeta.repo, newTone);
    }
  }

  function handleRepoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parts = repoInput.trim().split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      fetchReleases(parts[0], parts[1], tone);
    } else {
      setErrorMessage('Please enter repository in "owner/repo" format (e.g. facebook/react)');
    }
  }

  // Publish to Buffer
  async function handlePublishToBuffer(saveToDraft: boolean = true, targetText?: string) {
    if (selectedChannels.length === 0) {
      setErrorMessage('Please select at least one channel from the sidebar.');
      return;
    }

    setPublishing(true);
    setErrorMessage('');
    setPublishResult(null);

    const cardUrl = includeImageCard && currentRelease
      ? `${window.location.origin}/api/card/${currentRelease.id}?repo=${encodeURIComponent(
          repoMeta.repo
        )}&tag=${encodeURIComponent(currentRelease.tagName)}&title=${encodeURIComponent(
          currentRelease.name
        )}&highlight=${encodeURIComponent(currentRelease.features[0] || 'Release update')}`
      : undefined;

    const postContent = targetText || editedPosts.linkedin || editedPosts.twitter;

    try {
      const res = await fetch('/api/buffer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: selectedChannels,
          text: postContent,
          mediaUrl: cardUrl,
          saveToDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue post to Buffer');
      }

      setPublishResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with Buffer';
      setErrorMessage(msg);
    } finally {
      setPublishing(false);
    }
  }

  const previewCardUrl = currentRelease
    ? `/api/card/${currentRelease.id}?repo=${encodeURIComponent(
        repoMeta.repo
      )}&tag=${encodeURIComponent(currentRelease.tagName)}&title=${encodeURIComponent(
        currentRelease.name
      )}&highlight=${encodeURIComponent(currentRelease.features[0] || 'Performance upgrades')}&highlight=${encodeURIComponent(
        currentRelease.features[1] || 'Bug fixes'
      )}`
    : '';

  const getPlatformIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'twitter':
      case 'x':
        return <span className="text-[10px] font-bold text-white">𝕏</span>;
      case 'linkedin':
        return <span className="text-[10px] font-bold text-blue-400">in</span>;
      case 'bluesky':
        return <span className="text-[10px] font-bold text-sky-400">🦋</span>;
      default:
        return <Layers className="w-3 h-3 text-neutral-400" />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0d10] text-[#f4f4f6]">
      {/* 1. LEFT SIDEBAR (Buffer Style) */}
      <aside className="w-64 flex-shrink-0 bg-[#121316] border-r border-[#24262c] flex flex-col justify-between select-none">
        {/* Top: Logo & Nav */}
        <div className="p-4 space-y-5">
          {/* Brand header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shadow-sm">
                <GitCommit className="w-4 h-4 text-black stroke-[2.5]" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">GitSocial</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#202227] text-neutral-400 px-1.5 py-0.5 rounded border border-[#2e3038]">
              API
            </span>
          </div>

          {/* Action Button (Buffer "+ New" pill aesthetic) */}
          <button
            onClick={() => {
              setRepoInput('bufferapp/buffer-sample-apps');
              fetchReleases('bufferapp', 'buffer-sample-apps', tone);
            }}
            className="w-full bg-[#f4f4f6] hover:bg-white text-neutral-950 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Posts</span>
          </button>

          {/* Primary Navigation List */}
          <nav className="space-y-1">
            <button
              onClick={() => setCurrentNav('studio')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentNav === 'studio'
                  ? 'bg-[#1e2025] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#18191d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-4 h-4 text-neutral-400" />
                <span>Changelog Studio</span>
              </div>
              {releases.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-400 bg-[#252830] px-1.5 py-0.2 rounded">
                  {releases.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentNav('webhook')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentNav === 'webhook'
                  ? 'bg-[#1e2025] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#18191d]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-neutral-400" />
                <span>Automated Webhook</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
            </button>
          </nav>

          {/* Channels Section (Exact Buffer Dashboard Sidebar Item) */}
          <div className="pt-3 border-t border-[#24262c] space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Channels</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {selectedChannels.length}/{channels.length}
              </span>
            </div>

            <div className="space-y-1">
              {channels.map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedChannels(selectedChannels.filter((id) => id !== ch.id));
                      } else {
                        setSelectedChannels([...selectedChannels, ch.id]);
                      }
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1b1c21] text-white border border-[#2e3037]'
                        : 'text-neutral-400 hover:bg-[#16171b] hover:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {/* Avatar with service badge */}
                      <div className="relative w-6 h-6 rounded-md bg-[#23252b] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-neutral-300 border border-[#2a2c34]">
                        {ch.name.slice(0, 1).toUpperCase()}
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#121316] flex items-center justify-center">
                          {getPlatformIcon(ch.service)}
                        </span>
                      </div>
                      <span className="truncate text-xs">{ch.name}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded border-[#3a3d46] bg-[#1a1b20] accent-white"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Organization & Auth Status */}
        <div className="p-3 border-t border-[#24262c] bg-[#101114]">
          {bufferConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <div className="w-7 h-7 rounded-md bg-[#24262c] flex items-center justify-center text-xs font-semibold text-neutral-300">
                  MO
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-white truncate">Buffer Connected</p>
                  <p className="text-[10px] text-neutral-500">Live API Active</p>
                </div>
              </div>
              <button
                onClick={handleBufferLogout}
                className="text-neutral-400 hover:text-rose-400 p-1.5 transition"
                title="Disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/buffer/login"
              className="w-full bg-[#1f2127] hover:bg-[#282a32] border border-[#2e3038] text-neutral-200 text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-300" />
              <span>Connect Buffer</span>
            </a>
          )}
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0d10]">
        {/* Top Header Bar (Buffer Layout) */}
        <header className="h-14 border-b border-[#24262c] bg-[#101114] px-6 flex items-center justify-between select-none">
          {/* Repository Selector */}
          <form onSubmit={handleRepoSubmit} className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-neutral-400 font-mono bg-[#16171b] border border-[#272930] px-3 py-1.5 rounded-lg focus-within:border-neutral-400">
              <Terminal className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo"
                className="bg-transparent text-white focus:outline-none w-56 font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={loadingRepo}
              className="bg-[#1e2025] hover:bg-[#272930] border border-[#2d3039] text-neutral-300 text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              {loadingRepo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>Fetch</span>}
            </button>
            {repoMeta.stars !== undefined && repoMeta.stars > 0 && (
              <span className="text-[11px] font-mono text-neutral-400">★ {repoMeta.stars.toLocaleString()}</span>
            )}
          </form>

          {/* Right Action Tools: Tone & Queue All */}
          <div className="flex items-center space-x-3">
            {/* Tone Selector Dropdown */}
            <div className="flex items-center space-x-1.5 bg-[#16171b] border border-[#272930] px-2.5 py-1 rounded-lg text-xs text-neutral-300">
              <Sliders className="w-3 h-3 text-neutral-400" />
              <select
                value={tone}
                onChange={(e) => handleToneChange(e.target.value as PostTone)}
                className="bg-transparent text-xs text-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value="punchy" className="bg-[#121316]">Punchy ⚡</option>
                <option value="indie" className="bg-[#121316]">BuildInPublic 🚀</option>
                <option value="professional" className="bg-[#121316]">Professional 💼</option>
                <option value="storytelling" className="bg-[#121316]">Story Breakdown 📖</option>
              </select>
            </div>

            {/* Quick Presets */}
            <div className="hidden md:flex items-center space-x-1.5 text-xs text-neutral-400">
              <button
                onClick={() => {
                  setRepoInput('facebook/react');
                  fetchReleases('facebook', 'react', tone);
                }}
                className="hover:text-white bg-[#16171b] border border-[#272930] px-2 py-1 rounded text-[11px]"
              >
                react
              </button>
              <button
                onClick={() => {
                  setRepoInput('bufferapp/buffer-sample-apps');
                  fetchReleases('bufferapp', 'buffer-sample-apps', tone);
                }}
                className="hover:text-white bg-[#16171b] border border-[#272930] px-2 py-1 rounded text-[11px]"
              >
                sample-apps
              </button>
            </div>
          </div>
        </header>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {publishResult && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Successfully queued {publishResult.count} post(s) into Buffer drafts!</span>
            </div>
            <a
              href="https://publish.buffer.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline font-semibold flex items-center space-x-1"
            >
              <span>Open in Buffer</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* 3. CONTENT AREA (Scrollable Studio Feed) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {currentNav === 'studio' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Release Header Banner */}
              {currentRelease && (
                <div className="flex items-center justify-between pb-4 border-b border-[#24262c]">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h1 className="text-base font-bold text-white tracking-tight">
                        {currentRelease.tagName} — {currentRelease.name}
                      </h1>
                      <a
                        href={currentRelease.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-white transition"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Published on {new Date(currentRelease.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Releases Switcher Dropdown */}
                  {releases.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-neutral-500">Release:</span>
                      <select
                        value={selectedReleaseIndex}
                        onChange={(e) => setSelectedReleaseIndex(Number(e.target.value))}
                        className="bg-[#16171b] border border-[#272930] rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none"
                      >
                        {releases.map((rel, idx) => (
                          <option key={rel.id} value={idx}>
                            {rel.tagName} ({new Date(rel.publishedAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Media Card Toggle */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#141519] border border-[#24262c] text-xs text-neutral-300">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Attach Dynamic Release Card (Hosted for Buffer API)</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeImageCard}
                  onChange={(e) => setIncludeImageCard(e.target.checked)}
                  className="w-4 h-4 rounded border-[#3a3d46] bg-[#1a1b20] accent-white cursor-pointer"
                />
              </div>

              {/* POST CARDS TIMELINE (Exact Buffer Feed Aesthetic) */}
              <div className="space-y-4">
                {(['linkedin', 'twitter', 'bluesky', 'threads'] as SocialPlatform[]).map((platform) => {
                  const content = editedPosts[platform];
                  const maxChars = platform === 'twitter' ? 280 : platform === 'bluesky' ? 300 : 3000;
                  const isOver = content.length > maxChars;

                  return (
                    <div
                      key={platform}
                      className="rounded-xl bg-[#16171b] border border-[#24262c] hover:border-[#2d3039] transition-all duration-150 p-5 space-y-4 shadow-sm"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-8 h-8 rounded-lg bg-[#202228] flex items-center justify-center text-xs font-bold text-white border border-[#2c2f38]">
                            {platform === 'twitter' ? 'X' : platform.slice(0, 2).toUpperCase()}
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#121316] flex items-center justify-center">
                              {getPlatformIcon(platform)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-white capitalize">
                                {platform === 'twitter' ? 'X / Twitter' : platform}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">Channel Adaptor</span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              Formatted for {platform === 'twitter' ? 'short-form brevity' : platform === 'linkedin' ? 'professional storytelling' : 'casual updates'}
                            </p>
                          </div>
                        </div>

                        {/* Character count indicator */}
                        <div className="flex items-center space-x-2 text-xs font-mono">
                          <span className={isOver ? 'text-rose-400 font-bold' : 'text-neutral-400'}>
                            {content.length}
                          </span>
                          <span className="text-neutral-600">/ {maxChars}</span>
                        </div>
                      </div>

                      {/* Card Body: Editable Textarea */}
                      <textarea
                        rows={platform === 'linkedin' ? 6 : 4}
                        value={content}
                        onChange={(e) =>
                          setEditedPosts({
                            ...editedPosts,
                            [platform]: e.target.value,
                          })
                        }
                        className="w-full bg-[#111215] border border-[#24262c] focus:border-[#3d404c] rounded-lg p-3.5 text-xs text-neutral-200 focus:outline-none leading-relaxed font-sans resize-y"
                      />

                      {/* Card Footer: Actions */}
                      <div className="pt-2 flex items-center justify-between border-t border-[#22242a]">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(content);
                            }}
                            className="text-neutral-400 hover:text-white p-1.5 rounded transition text-xs flex items-center space-x-1"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePublishToBuffer(true, content)}
                            disabled={publishing}
                            className="bg-[#1f2127] hover:bg-[#282a32] border border-[#2e3038] text-neutral-200 text-xs font-medium py-1.5 px-3 rounded-lg flex items-center space-x-1.5 transition"
                          >
                            <Send className="w-3 h-3 text-neutral-400" />
                            <span>Save Draft to Buffer</span>
                          </button>

                          <button
                            onClick={() => handlePublishToBuffer(false, content)}
                            disabled={publishing}
                            className="bg-[#f4f4f6] hover:bg-white text-neutral-950 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 transition shadow-sm"
                          >
                            <Share2 className="w-3 h-3 text-neutral-950" />
                            <span>Schedule to Buffer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic OG Card Visual Preview */}
              {includeImageCard && previewCardUrl && (
                <div className="rounded-xl bg-[#16171b] border border-[#24262c] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold text-white">Dynamic Visual Card (Generated at Edge)</span>
                    <a
                      href={previewCardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center space-x-1"
                    >
                      <span>Open image URL</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-[#22242a] bg-[#0c0d10] aspect-[1200/630] relative shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewCardUrl}
                      alt="Release Social Card"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTOMATION WEBHOOK */}
          {currentNav === 'webhook' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="rounded-xl bg-[#16171b] border border-[#24262c] p-6 space-y-5">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-[#202227] flex items-center justify-center text-white border border-[#2a2c34]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Zero-Touch Automation (&quot;Build &amp; Forget&quot;)</h2>
                    <p className="text-xs text-neutral-400">
                      Whenever you publish a release or push a git tag, GitSocial drafts the update into Buffer.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-neutral-300">
                  <p className="text-neutral-400">
                    Set up this webhook once in your GitHub repository to eliminate manual social posting:
                  </p>

                  <ol className="list-decimal list-inside space-y-2 bg-[#101114] p-4 rounded-lg border border-[#24262c] font-mono text-neutral-300">
                    <li>Go to your GitHub repo → <strong>Settings</strong> → <strong>Webhooks</strong>.</li>
                    <li>Click <strong>Add webhook</strong>.</li>
                    <li>Paste the Payload URL below.</li>
                    <li>Set Content type to <code>application/json</code>.</li>
                    <li>Trigger on <strong>Releases</strong>.</li>
                  </ol>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Payload URL:
                    </label>
                    <div className="flex items-center space-x-2 bg-[#0e0f12] border border-[#272930] rounded-lg p-2.5 font-mono text-xs text-neutral-200">
                      <span className="flex-1 truncate">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/api/webhook/github`
                          : '/api/webhook/github'}
                      </span>
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhook/github`);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }
                        }}
                        className="text-neutral-400 hover:text-white transition p-1"
                      >
                        {copiedWebhook ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
