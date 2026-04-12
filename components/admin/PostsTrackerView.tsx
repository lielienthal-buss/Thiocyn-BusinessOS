import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

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

type StatusFilter = 'all' | 'planning' | 'in_production' | 'review' | 'scheduled' | 'published';

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  in_production: 'In Production',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published',
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-500/15 text-[#515154] border border-slate-500/20',
  in_production: 'bg-[#E09B37]/15 text-[#E09B37] border border-[#E09B37]/25',
  review: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  scheduled: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  published: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

const BRAND_COLORS: Record<string, string> = {
  thiocyn: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  paigh: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  'take-a-shot': 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  'dr-severin': 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  wristr: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  tj: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

const BRAND_LABELS: Record<string, string> = {
  thiocyn: 'Thiocyn',
  paigh: 'Paigh',
  'take-a-shot': 'Take A Shot',
  'dr-severin': 'Dr. Severin',
  wristr: 'Wristr',
  tj: 'T&J',
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_production', label: 'In Production' },
  { value: 'review', label: 'Review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
];

const PostsTrackerView: React.FC = () => {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data as ContentPost[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const filteredPosts =
    statusFilter === 'all'
      ? posts
      : posts.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1d1d1f] tracking-tight">Posts Tracker</h2>
          <p className="text-[#6e6e73] text-sm mt-0.5">Cross-brand content pipeline — all platforms</p>
        </div>
        <button
          onClick={() => alert('Coming soon')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E09B37] hover:bg-[#c8832a] text-[#1d1d1f] text-sm font-bold rounded-lg transition-colors"
        >
          <span>+</span>
          Add Post
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              statusFilter === opt.value
                ? 'bg-[#E09B37] text-[#1d1d1f] border-primary-600'
                : 'bg-black/[0.03] text-[#6e6e73] border-black/[0.06] hover:border-white/[0.12] hover:text-[#1d1d1f]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-primary-600" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-black/[0.08] bg-black/[0.02]">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-[#6e6e73] font-semibold">No posts yet</p>
          <p className="text-[#86868b] text-sm mt-1">Add your first post to start tracking content production.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-black/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/50 border-b border-black/[0.06]">
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Brand</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Format</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-[#6e6e73]">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] bg-white/70">
                {filteredPosts.map(post => (
                  <tr key={post.id} className="hover:bg-black/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${BRAND_COLORS[post.brand_id] ?? 'bg-slate-500/15 text-[#515154] border border-slate-500/20'}`}>
                        {BRAND_LABELS[post.brand_id] ?? post.brand_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#515154] capitalize">{post.platform}</td>
                    <td className="px-4 py-3 text-[#515154] capitalize">{post.format}</td>
                    <td className="px-4 py-3 font-semibold text-[#1d1d1f] max-w-[240px] truncate" title={post.title}>
                      {post.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[post.status] ?? 'bg-slate-500/15 text-[#515154] border border-slate-500/20'}`}>
                        {STATUS_LABELS[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{post.assigned_to_email ?? <span className="text-[#86868b]">—</span>}</td>
                    <td className="px-4 py-3 text-[#6e6e73]">
                      {post.due_date
                        ? new Date(post.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : <span className="text-[#86868b]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white/70 rounded-xl border border-black/[0.06] p-4 space-y-3 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#1d1d1f] text-sm leading-snug flex-1">{post.title}</p>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[post.status] ?? 'bg-slate-500/15 text-[#515154] border border-slate-500/20'}`}>
                    {STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${BRAND_COLORS[post.brand_id] ?? 'bg-slate-500/15 text-[#515154] border border-slate-500/20'}`}>
                    {BRAND_LABELS[post.brand_id] ?? post.brand_id}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-[#515154] capitalize">{post.platform}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-[#515154] capitalize">{post.format}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{post.assigned_to_email ?? 'Unassigned'}</span>
                  <span>
                    {post.due_date
                      ? new Date(post.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'No due date'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PostsTrackerView;
