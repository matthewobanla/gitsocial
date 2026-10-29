'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCommit,
  Share2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Layers,
  Send,
  RefreshCw,
  Terminal,
  Copy,
  ChevronRight,
  Eye,
  Sliders,
  AlertCircle,
  LogOut,
  Zap
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
  const [bufferLoading, setBufferLoading] = useState<boolean>(true);
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // GitHub State
  const [repoInput, setRepoInput] = useState<string>('bufferapp/buffer-sample-apps');
  const [loadingRepo, setLoadingRepo] = useState<boolean>(false);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number>(0);
  const [repoMeta, setRepoMeta] = useState<{ owner: string; repo: string; stars?: number }>({
    owner: 'bufferapp',
    repo: 'buffer-sample-apps',
  });

  // Post generation & customisation state
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('linkedin');
  const [tone, setTone] = useState<PostTone>('punchy');
  const [editedText, setEditedText] = useState<string>('');
  const [includeImageCard, setIncludeImageCard] = useState<boolean>(true);

  // Tab mode: Studio vs Webhook Automation
  const [activeTab, setActiveTab] = useState<'studio' | 'webhook'>('studio');

  // Publishing status
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
        const firstRelease = fetchedReleases[0];
        const defaultText = firstRelease.bundle?.variants['linkedin']?.text || '';
        setEditedText(defaultText);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading repository';
      setErrorMessage(msg);
    } finally {
      setLoadingRepo(false);
    }
  }, []);

  const checkBufferAuth = useCallback(async () => {
    setBufferLoading(true);
    try {
      const res = await fetch('/api/buffer/channels');
      const data = await res.json();
      if (data.connected && data.channels) {
        setBufferConnected(true);
        setChannels(data.channels);
        setSelectedChannels(data.channels.map((c: BufferChannel) => c.id));
      } else {
        setBufferConnected(false);
        const mockChannels: BufferChannel[] = [
          { id: 'mock-li', name: 'LinkedIn Company Page', service: 'linkedin' },
          { id: 'mock-tw', name: 'X / Twitter Profile', service: 'twitter' },
          { id: 'mock-bs', name: 'Bluesky Handle', service: 'bluesky' },
          { id: 'mock-th', name: 'Threads Account', service: 'threads' },
        ];
        setChannels(mockChannels);
        setSelectedChannels(mockChannels.map((c) => c.id));
      }
    } catch {
      setBufferConnected(false);
    } finally {
      setBufferLoading(false);
    }
  }, []);

  // 1. Initial Load: Check Buffer OAuth & Load sample repo
  useEffect(() => {
    checkBufferAuth();
    fetchReleases('bufferapp', 'buffer-sample-apps', 'punchy');
  }, [checkBufferAuth, fetchReleases]);

  async function handleBufferLogout() {
    await fetch('/api/auth/buffer/logout', { method: 'POST' });
    setBufferConnected(false);
    checkBufferAuth();
  }

  // Update text when switching release, tone, or platform
  const currentRelease = releases[selectedReleaseIndex];

  useEffect(() => {
    if (currentRelease?.bundle?.variants[activePlatform]) {
      setEditedText(currentRelease.bundle.variants[activePlatform].text);
    }
  }, [activePlatform, selectedReleaseIndex, currentRelease]);

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
      setErrorMessage('Please enter repository in "owner/repo" format (e.g. vercel/next.js)');
    }
  }

  // 3. Publish to Buffer
  async function handlePublishToBuffer(saveToDraft: boolean = true) {
    if (selectedChannels.length === 0) {
      setErrorMessage('Please select at least one channel to queue this post.');
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

    try {
      const res = await fetch('/api/buffer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: selectedChannels,
          text: editedText,
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

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 antialiased">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GitCommit className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-white">GitSocial</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                  Buffer Commit Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">Automate your social releases via Buffer API</p>
            </div>
          </div>

          {/* Buffer OAuth Status Pill */}
          <div className="flex items-center space-x-4">
            {bufferLoading ? (
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking Buffer...</span>
              </div>
            ) : bufferConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Buffer Connected ({channels.length} channels)</span>
                </div>
                <button
                  onClick={handleBufferLogout}
                  className="text-xs text-slate-400 hover:text-rose-400 p-1.5 transition"
                  title="Disconnect Buffer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/buffer/login"
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-md shadow-blue-600/20"
              >
                <Share2 className="w-4 h-4" />
                <span>Connect Buffer Account</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'studio'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Interactive Release Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'webhook'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Zero-Touch Webhook (&quot;Build &amp; Forget&quot;)</span>
            </button>
          </div>

          {/* Quick preset selector for judges */}
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Quick Presets:</span>
            <button
              onClick={() => {
                setRepoInput('bufferapp/buffer-sample-apps');
                fetchReleases('bufferapp', 'buffer-sample-apps', tone);
              }}
              className="hover:text-blue-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50"
            >
              buffer-sample-apps
            </button>
            <button
              onClick={() => {
                setRepoInput('facebook/react');
                fetchReleases('facebook', 'react', tone);
              }}
              className="hover:text-blue-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50"
            >
              facebook/react
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Global Success Banner */}
        {publishResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">Successfully queued to Buffer!</p>
                <p className="text-xs text-emerald-400/80">
                  Created {publishResult.count} {publishResult.mode === 'draft' ? 'draft post(s)' : 'scheduled post(s)'} across selected channels.
                </p>
              </div>
            </div>
            <a
              href="https://publish.buffer.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition"
            >
              <span>View in Buffer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* TAB 1: STUDIO */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Repository & Release Settings */}
            <div className="lg:col-span-5 space-y-6">
              {/* GitHub Repo Input Box */}
              <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span>GitHub Repository</span>
                  </label>
                  {repoMeta.stars !== undefined && repoMeta.stars > 0 && (
                    <span className="text-xs text-amber-400 font-mono">★ {repoMeta.stars.toLocaleString()}</span>
                  )}
                </div>

                <form onSubmit={handleRepoSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="owner/repo"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loadingRepo}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center space-x-1.5"
                  >
                    {loadingRepo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Fetch</span>}
                  </button>
                </form>

                {/* Release Selector */}
                {releases.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs text-slate-400 font-medium">Selected Release:</label>
                    <select
                      value={selectedReleaseIndex}
                      onChange={(e) => setSelectedReleaseIndex(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {releases.map((rel, idx) => (
                        <option key={rel.id} value={idx}>
                          {rel.tagName} — {rel.name} ({new Date(rel.publishedAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Tone & AI Generation Controls */}
              <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Copy Tone &amp; Angle</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'punchy', label: '⚡ Punchy & Direct' },
                    { id: 'indie', label: '🚀 Indie / BuildInPublic' },
                    { id: 'professional', label: '💼 Professional Tech' },
                    { id: 'storytelling', label: '📖 Story Breakdown' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleToneChange(t.id as PostTone)}
                      className={`text-xs text-left p-2.5 rounded-lg border transition font-medium ${
                        tone === t.id
                          ? 'bg-blue-600/10 border-blue-500 text-blue-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buffer Channels Destination */}
              <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Target Social Channels</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    {selectedChannels.length} of {channels.length} selected
                  </span>
                </div>

                <div className="space-y-2">
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
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? 'bg-slate-900/90 border-blue-500/50 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold uppercase text-slate-300">
                            {ch.service.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-200">{ch.name}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{ch.service}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Media card toggle */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Attach Dynamic Release Card</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeImageCard}
                    onChange={(e) => setIncludeImageCard(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Multi-Platform Preview & Queue Actions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Platform Switcher Tabs */}
              <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex space-x-2">
                    {(['linkedin', 'twitter', 'bluesky', 'threads'] as SocialPlatform[]).map((plat) => (
                      <button
                        key={plat}
                        onClick={() => setActivePlatform(plat)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition ${
                          activePlatform === plat
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {plat === 'twitter' ? 'X / Twitter' : plat}
                      </button>
                    ))}
                  </div>

                  {/* Character Counter */}
                  <div className="text-xs font-mono text-slate-400">
                    <span
                      className={
                        activePlatform === 'twitter' && editedText.length > 280
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {editedText.length}
                    </span>
                    <span className="text-slate-600">
                      {' '}
                      / {activePlatform === 'twitter' ? 280 : activePlatform === 'bluesky' ? 300 : 3000}
                    </span>
                  </div>
                </div>

                {/* Editable Social Post Textarea */}
                <div className="space-y-2">
                  <textarea
                    rows={8}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Generating post copy..."
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-3.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Release Card Visual Preview */}
                {includeImageCard && previewCardUrl && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Generated Social Image (Auto-hosted for Buffer)</span>
                      <a
                        href={previewCardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <span>Open Full Card</span>
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-[1200/630] relative shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewCardUrl}
                        alt="Release Card Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span>Target: </span>
                    <strong className="text-slate-200">
                      {selectedChannels.length} channel(s)
                    </strong>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handlePublishToBuffer(true)}
                      disabled={publishing}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center space-x-2"
                    >
                      {publishing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span>Save as Buffer Draft (Safe)</span>
                    </button>

                    <button
                      onClick={() => handlePublishToBuffer(false)}
                      disabled={publishing}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition flex items-center space-x-2 shadow-lg shadow-blue-600/20"
                    >
                      {publishing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>Schedule to Buffer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ZERO-TOUCH WEBHOOK AUTOMATION */}
        {activeTab === 'webhook' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Zero-Touch Automation (&quot;Build &amp; Forget&quot;)</h2>
                  <p className="text-xs text-slate-400">
                    Automatically draft a post in Buffer every time you publish a new GitHub Release.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <p>
                  With GitSocial webhooks, you never need to leave your code editor. When your GitHub Action or team pushes a new release tag:
                </p>

                <ol className="list-decimal list-inside space-y-2 bg-slate-900/60 p-4 rounded-lg border border-slate-800 font-mono text-slate-300">
                  <li>Go to your GitHub Repository → <strong>Settings</strong> → <strong>Webhooks</strong>.</li>
                  <li>Click <strong>Add webhook</strong>.</li>
                  <li>Set <strong>Payload URL</strong> to the URL below.</li>
                  <li>Set <strong>Content type</strong> to <code>application/json</code>.</li>
                  <li>Under triggers, select <strong>Let me select individual events</strong> → check <strong>Releases</strong>.</li>
                </ol>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-400">Your Webhook URL:</label>
                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-blue-300">
                    <span className="flex-1 truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/github` : '/api/webhook/github'}
                    </span>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhook/github`);
                          setCopiedWebhook(true);
                          setTimeout(() => setCopiedWebhook(false), 2000);
                        }
                      }}
                      className="text-slate-400 hover:text-white transition p-1"
                    >
                      {copiedWebhook ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-12 py-6 px-6 text-center text-xs text-slate-500">
        <p>
          GitSocial • Built for the <strong>Buffer Commit</strong> Hackathon • Powered by the Buffer GraphQL API
        </p>
      </footer>
    </div>
  );
}
