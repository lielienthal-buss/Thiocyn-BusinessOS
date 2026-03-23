import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Spinner from '../ui/Spinner';

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
  planning: 'bg-gray-100 text-gray-600 border border-gray-200',
  in_production: 'bg-amber-50 text-amber-700 border border-amber-200',
  review: 'bg-blue-50 text-blue-700 border border-blue-200',
  scheduled: 'bg-purple-50 text-purple-700 border border-purple-200',
  published: 'bg-green-50 text-green-700 border border-green-200',
};

const BRAND_COLORS: Record<string, string> = {
  thiocyn: 'bg-teal-50 text-teal-700 border border-teal-200',
  paigh: 'bg-violet-50 text-violet-700 border border-violet-200',
  'take-a-shot': 'bg-orange-50 text-orange-700 border border-orange-200',
  'dr-severin': 'bg-sky-50 text-sky-700 border border-sky-200',
  wristr: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  tj: 'bg-rose-50 text-rose-700 border border-rose-200',
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
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Posts Tracker</h2>
          <p className="text-gray-400 text-sm mt-0.5">Cross-brand content pipeline — all platforms</p>
        </div>
        <button
          onClick={() => alert('Coming soon')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg transition-colors"
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
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
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
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-gray-500 font-semibold">No posts yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first post to start tracking content production.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Brand</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Format</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-400">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredPosts.map(post => (
                  <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${BRAND_COLORS[post.brand_id] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        {BRAND_LABELS[post.brand_id] ?? post.brand_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{post.platform}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{post.format}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-[240px] truncate" title={post.title}>
                      {post.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[post.status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        {STATUS_LABELS[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{post.assigned_to_email ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {post.due_date
                        ? new Date(post.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm leading-snug flex-1">{post.title}</p>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[post.status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                    {STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${BRAND_COLORS[post.brand_id] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                    {BRAND_LABELS[post.brand_id] ?? post.brand_id}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{post.platform}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{post.format}</span>
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
