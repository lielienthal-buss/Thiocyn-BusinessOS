import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoadingState, EmptyState } from '@/components/ui/DataStates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContentPost {
  id: string;
  brand_id: string;
  platform: string;
  format: string;
  title: string;
  status: string;
  hook: string | null;
  notes: string | null;
  assigned_to_email: string | null;
  due_date: string | null;
  published_at: string | null;
  created_at: string;
}

interface HashtagStrategy {
  brand_slug: string;
  branded_hashtag: string;
  niche_hashtags_high: string[];
  niche_hashtags_mid: string[];
  niche_hashtags_micro: string[];
  banned_hashtags: string[];
  rotation_rules: string;
}

interface ContentDirection {
  brand_slug: string;
  week_in_cycle: number;
  direction_key: string;
  title: string;
  description: string;
  angle_categories: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  thiocyn: 'Thiocyn',
  paigh: 'Paigh',
  'take-a-shot': 'Take A Shot',
  'dr-severin': 'Dr. Severin',
  wristr: 'Wristr',
  tj: 'T&J',
};

// Brand colors for calendar pills (Tailwind classes — must be static for JIT)
const BRAND_PILL: Record<string, string> = {
  thiocyn: 'bg-teal-100 text-teal-700 ring-1 ring-teal-200',
  paigh: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  'take-a-shot': 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  'dr-severin': 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  wristr: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  tj: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  in_production: 'In Production',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published',
};

const DIRECTION_LABELS: Record<string, { label: string; emoji: string }> = {
  problem_solution: { label: 'Problem → Lösung', emoji: '🔴' },
  storytelling: { label: 'Storytelling', emoji: '📖' },
  aesthetic: { label: 'Ästhetik / Routine', emoji: '✨' },
  myth_buster: { label: 'Mythos brechen', emoji: '⚡' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(viewMonth: Date): Date[] {
  // Monday-start 6-week grid
  const first = startOfMonth(viewMonth);
  const dayOfWeek = (first.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOfWeek);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function isoDay(d: Date | string | null): string | null {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().split('T')[0];
}

function sameDay(a: Date, b: string | null) {
  if (!b) return false;
  return isoDay(a) === isoDay(b);
}

// ─── Component ──────────────────────────────────────────────────────────────

const ContentCalendarView: React.FC = () => {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [hashtags, setHashtags] = useState<HashtagStrategy[]>([]);
  const [directions, setDirections] = useState<ContentDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [bottomTab, setBottomTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [sidebarTab, setSidebarTab] = useState<'hashtags' | 'directions'>('hashtags');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [postsRes, hashRes, dirRes] = await Promise.all([
      supabase.from('content_posts').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('hashtag_strategies').select('*'),
      supabase
        .from('content_directions')
        .select('*')
        .order('brand_slug')
        .order('week_in_cycle'),
    ]);
    if (postsRes.data) setPosts(postsRes.data as ContentPost[]);
    if (hashRes.data) setHashtags(hashRes.data as HashtagStrategy[]);
    if (dirRes.data) setDirections(dirRes.data as ContentDirection[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ─── Filtering ────────────────────────────────────────────────────────
  const filteredPosts = useMemo(
    () => (brandFilter === 'all' ? posts : posts.filter(p => p.brand_id === brandFilter)),
    [posts, brandFilter]
  );

  const postsByDay = useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    for (const p of filteredPosts) {
      const key = isoDay(p.due_date) ?? isoDay(p.published_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filteredPosts]);

  const monthGrid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(now.getDate() + 7);

  const upcomingQueue = useMemo(
    () =>
      filteredPosts
        .filter(p => {
          if (!p.due_date) return false;
          const d = new Date(p.due_date);
          return d >= new Date(now.toDateString()) && d <= in7Days;
        })
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [filteredPosts]
  );

  const pastPosts = useMemo(
    () =>
      filteredPosts
        .filter(p => p.status === 'published' || (p.published_at && new Date(p.published_at) < now))
        .sort((a, b) => {
          const da = a.published_at ?? a.due_date ?? '';
          const db = b.published_at ?? b.due_date ?? '';
          return da < db ? 1 : -1;
        }),
    [filteredPosts]
  );

  // Current week in 4-week cycle
  const currentWeekInCycle =
    ((Math.floor((Date.now() - new Date('2026-01-05').getTime()) / (7 * 24 * 60 * 60 * 1000)) % 4) + 1);

  // ─── Hashtag CRUD ─────────────────────────────────────────────────────
  const updateHashtag = async (brand_slug: string, field: keyof HashtagStrategy, value: any) => {
    setHashtags(prev =>
      prev.map(h => (h.brand_slug === brand_slug ? { ...h, [field]: value } : h))
    );
    await supabase.from('hashtag_strategies').update({ [field]: value }).eq('brand_slug', brand_slug);
  };

  const addTagToField = (brand_slug: string, field: keyof HashtagStrategy, tag: string) => {
    const h = hashtags.find(x => x.brand_slug === brand_slug);
    if (!h) return;
    const current = (h[field] as string[]) ?? [];
    if (current.includes(tag)) return;
    updateHashtag(brand_slug, field, [...current, tag]);
  };

  const removeTagFromField = (brand_slug: string, field: keyof HashtagStrategy, tag: string) => {
    const h = hashtags.find(x => x.brand_slug === brand_slug);
    if (!h) return;
    const updated = ((h[field] as string[]) ?? []).filter(t => t !== tag);
    updateHashtag(brand_slug, field, updated);
  };

  // ─── Add Post (inline) ────────────────────────────────────────────────
  const [newPost, setNewPost] = useState({
    brand_id: 'thiocyn',
    platform: 'instagram',
    format: 'reel',
    title: '',
    due_date: '',
    status: 'planning',
  });

  const submitNewPost = async () => {
    if (!newPost.title.trim() || !newPost.due_date) return;
    const { data, error } = await supabase.from('content_posts').insert([newPost]).select().single();
    if (!error && data) {
      setPosts(prev => [...prev, data as ContentPost]);
      setNewPost({ ...newPost, title: '', due_date: '' });
      setShowAddForm(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading) return <LoadingState label="Content calendar laden…" />;

  const monthLabel = viewMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Content Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Timeline, Queue, Hashtag-Strategy — alles für Planung & Production.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="bg-white ring-1 ring-slate-200 text-sm text-slate-700 rounded-lg px-3 py-1.5"
          >
            <option value="all">Alle Brands</option>
            {Object.entries(BRAND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors"
          >
            + Post
          </button>
        </div>
      </div>

      {/* Add form (inline) */}
      {showAddForm && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              type="text"
              value={newPost.title}
              onChange={e => setNewPost({ ...newPost, title: e.target.value })}
              placeholder="Titel"
              className="md:col-span-2 ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <select
              value={newPost.brand_id}
              onChange={e => setNewPost({ ...newPost, brand_id: e.target.value })}
              className="ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {Object.entries(BRAND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={newPost.platform}
              onChange={e => setNewPost({ ...newPost, platform: e.target.value })}
              className="ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <input
              type="date"
              value={newPost.due_date}
              onChange={e => setNewPost({ ...newPost, due_date: e.target.value })}
              className="ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <button
              onClick={submitNewPost}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg px-3 py-2 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* This-week direction banner */}
      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-amber-700 font-bold">
            Diese Woche: Content-Richtung {currentWeekInCycle}/4
          </div>
          <div className="text-slate-900 font-bold">
            {DIRECTION_LABELS[['problem_solution', 'storytelling', 'aesthetic', 'myth_buster'][currentWeekInCycle - 1]]?.emoji}{' '}
            {DIRECTION_LABELS[['problem_solution', 'storytelling', 'aesthetic', 'myth_buster'][currentWeekInCycle - 1]]?.label}
          </div>
        </div>
      </div>

      {/* Main grid: Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Calendar */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 capitalize">{monthLabel}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ←
              </button>
              <button
                onClick={() => setViewMonth(startOfMonth(new Date()))}
                className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Heute
              </button>
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                →
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs font-bold text-slate-500 mb-1">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="px-1 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, i) => {
              const dayPosts = postsByDay.get(isoDay(day) ?? '') ?? [];
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isToday = sameDay(day, new Date().toISOString());
              return (
                <div
                  key={i}
                  className={`min-h-[80px] rounded-lg p-1.5 ring-1 ${
                    inMonth ? 'bg-slate-50 ring-slate-200' : 'bg-slate-50/50 ring-slate-200/50'
                  } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div
                    className={`text-[11px] font-bold mb-1 ${
                      inMonth ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map(p => (
                      <div
                        key={p.id}
                        title={`${p.title} — ${STATUS_LABELS[p.status] ?? p.status}`}
                        className={`truncate text-[10px] px-1.5 py-0.5 rounded ${
                          BRAND_PILL[p.brand_id] ?? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                        }`}
                      >
                        {p.title}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-slate-500">+{dayPosts.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: hashtags + directions */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4">
            {(['hashtags', 'directions'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSidebarTab(t)}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                  sidebarTab === t ? 'bg-white text-slate-900 ring-1 ring-slate-200' : 'text-slate-500'
                }`}
              >
                {t === 'hashtags' ? 'Hashtags' : 'Directions'}
              </button>
            ))}
          </div>

          {sidebarTab === 'hashtags' && (
            <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
              {(brandFilter === 'all'
                ? hashtags
                : hashtags.filter(h => h.brand_slug === brandFilter)
              ).map(h => (
                <div key={h.brand_slug} className="ring-1 ring-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{BRAND_LABELS[h.brand_slug] ?? h.brand_slug}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                      {h.branded_hashtag}
                    </span>
                  </div>
                  {(
                    [
                      { field: 'niche_hashtags_high' as const, label: 'High', cls: 'bg-green-50 text-green-700' },
                      { field: 'niche_hashtags_mid' as const, label: 'Mid', cls: 'bg-blue-50 text-blue-700' },
                      { field: 'niche_hashtags_micro' as const, label: 'Micro', cls: 'bg-purple-50 text-purple-700' },
                      { field: 'banned_hashtags' as const, label: 'Banned', cls: 'bg-red-50 text-red-700 line-through' },
                    ] as const
                  ).map(({ field, label, cls }) => (
                    <div key={field} className="mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {((h as any)[field] ?? []).map((tag: string) => (
                          <span
                            key={tag}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${cls} group/tag cursor-pointer`}
                          >
                            {tag}
                            <button
                              onClick={() => removeTagFromField(h.brand_slug, field, tag)}
                              className="ml-1 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <HashtagInput onAdd={tag => addTagToField(h.brand_slug, field, tag)} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {hashtags.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">Keine Hashtag-Strategien.</p>
              )}
            </div>
          )}

          {sidebarTab === 'directions' && (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {(brandFilter === 'all'
                ? directions
                : directions.filter(d => d.brand_slug === brandFilter)
              ).map(d => {
                const dir = DIRECTION_LABELS[d.direction_key];
                const isThisWeek = d.week_in_cycle === currentWeekInCycle;
                return (
                  <div
                    key={`${d.brand_slug}-${d.week_in_cycle}`}
                    className={`ring-1 rounded-xl p-3 ${
                      isThisWeek ? 'ring-amber-300 bg-amber-50' : 'ring-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {BRAND_LABELS[d.brand_slug] ?? d.brand_slug} · W{d.week_in_cycle}
                        {isThisWeek ? ' ← jetzt' : ''}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {dir?.emoji} {d.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{d.description}</p>
                  </div>
                );
              })}
              {directions.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">Keine Content-Directions.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Queue / Past / All */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-4">
          {(
            [
              { k: 'upcoming', l: `Next 7 days (${upcomingQueue.length})` },
              { k: 'past', l: `Past (${pastPosts.length})` },
              { k: 'all', l: `All (${filteredPosts.length})` },
            ] as const
          ).map(t => (
            <button
              key={t.k}
              onClick={() => setBottomTab(t.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                bottomTab === t.k ? 'bg-white text-slate-900 ring-1 ring-slate-200' : 'text-slate-500'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <PostsTable
          posts={
            bottomTab === 'upcoming' ? upcomingQueue : bottomTab === 'past' ? pastPosts : filteredPosts
          }
        />
      </div>
    </div>
  );
};

// ─── Posts Table ─────────────────────────────────────────────────────────────

const PostsTable: React.FC<{ posts: ContentPost[] }> = ({ posts }) => {
  if (posts.length === 0) {
    return <EmptyState icon="📅" title="Keine Posts" description="Leg einen neuen Post an oder wechsle den Filter." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-200">
            <th className="text-left py-2 px-3">Brand</th>
            <th className="text-left py-2 px-3">Platform</th>
            <th className="text-left py-2 px-3">Format</th>
            <th className="text-left py-2 px-3">Title</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-left py-2 px-3">Assignee</th>
            <th className="text-left py-2 px-3">Due</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(p => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                    BRAND_PILL[p.brand_id] ?? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  {BRAND_LABELS[p.brand_id] ?? p.brand_id}
                </span>
              </td>
              <td className="py-2 px-3 capitalize text-slate-700">{p.platform}</td>
              <td className="py-2 px-3 capitalize text-slate-700">{p.format}</td>
              <td className="py-2 px-3 font-semibold text-slate-900 max-w-[280px] truncate" title={p.title}>
                {p.title}
              </td>
              <td className="py-2 px-3 text-slate-700">{STATUS_LABELS[p.status] ?? p.status}</td>
              <td className="py-2 px-3 text-slate-600">{p.assigned_to_email ?? '—'}</td>
              <td className="py-2 px-3 text-slate-600">
                {p.due_date ? new Date(p.due_date).toLocaleDateString('de-DE') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Hashtag Input ───────────────────────────────────────────────────────────

function HashtagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const commit = () => {
    const raw = value.trim();
    const tag = raw.startsWith('#') ? raw : raw ? `#${raw}` : '';
    if (tag) {
      onAdd(tag);
      setValue('');
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-1.5 py-0.5 text-[10px] text-slate-500 border border-dashed border-slate-300 rounded hover:border-slate-500"
      >
        +
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setValue('');
          setEditing(false);
        }
      }}
      className="w-20 px-1.5 py-0.5 text-[10px] bg-white ring-1 ring-indigo-500 rounded text-slate-900 outline-none"
      placeholder="#tag"
    />
  );
}

export default ContentCalendarView;
