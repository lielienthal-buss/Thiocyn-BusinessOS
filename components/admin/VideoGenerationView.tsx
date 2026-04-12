import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'draft' | 'queued' | 'processing' | 'done' | 'failed';
type JobType = 'image' | 'video';

const BRANDS = ['Thiocyn', 'Take A Shot', 'Dr. Severin', 'Paigh', 'Wristr', 'Timber & John'] as const;
type Brand = typeof BRANDS[number];

const STYLE_PRESETS = [
  { id: 'cinematic', label: 'Cinematic', credits: 9 },
  { id: 'ugc', label: 'UGC Style', credits: 5 },
  { id: 'product', label: 'Product Shot', credits: 3 },
  { id: 'lifestyle', label: 'Lifestyle', credits: 7 },
  { id: 'minimal', label: 'Minimal Clean', credits: 4 },
] as const;

interface VideoJob {
  id: string;
  brand: Brand;
  job_type: JobType;
  prompt: string;
  style_preset: string;
  character_ref_url: string | null;
  status: JobStatus;
  result_url: string | null;
  credits_used: number | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; dot: string }> = {
  draft:      { label: 'Draft',      color: 'text-gray-400',   dot: 'bg-gray-500' },
  queued:     { label: 'Queued',     color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  processing: { label: 'Processing', color: 'text-blue-400',   dot: 'bg-blue-400 animate-pulse' },
  done:       { label: 'Done',       color: 'text-green-400',  dot: 'bg-green-400' },
  failed:     { label: 'Failed',     color: 'text-red-400',    dot: 'bg-red-400' },
};

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── New Job Modal ─────────────────────────────────────────────────────────────

interface NewJobModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const NewJobModal: React.FC<NewJobModalProps> = ({ onClose, onCreated }) => {
  const [brand, setBrand] = useState<Brand>('Thiocyn');
  const [jobType, setJobType] = useState<JobType>('video');
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('cinematic');
  const [charRefUrl, setCharRefUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStyle = STYLE_PRESETS.find(s => s.id === stylePreset)!;
  const estimatedCredits = jobType === 'image' ? 3 : selectedStyle.credits;

  const handleCreate = async () => {
    if (!prompt.trim()) { setError('Prompt is required.'); return; }
    setSubmitting(true);
    setError(null);

    const { error: err } = await supabase.from('video_jobs').insert({
      brand,
      job_type: jobType,
      prompt: prompt.trim(),
      style_preset: stylePreset,
      character_ref_url: charRefUrl.trim() || null,
      status: 'queued',
      credits_used: null,
      result_url: null,
      error_msg: null,
    });

    if (err) { setError(err.message); setSubmitting(false); return; }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[#1d1d1f] font-black text-lg tracking-tight">New Generation Job</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-[#1d1d1f] transition-colors text-xl leading-none">✕</button>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

        {/* Type Toggle */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
          <div className="flex gap-2">
            {(['image', 'video'] as JobType[]).map(t => (
              <button
                key={t}
                onClick={() => setJobType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                  jobType === t
                    ? 'bg-violet-600 border-violet-500 text-[#1d1d1f]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {t === 'image' ? '🖼 Image' : '🎬 Video'}
              </button>
            ))}
          </div>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand</label>
          <select
            value={brand}
            onChange={e => setBrand(e.target.value as Brand)}
            className="w-full bg-white/5 border border-white/10 text-[#1d1d1f] rounded-xl p-3 text-sm focus:outline-none focus:border-violet-500"
          >
            {BRANDS.map(b => <option key={b} value={b} className="bg-[#111]">{b}</option>)}
          </select>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="Person applying serum to scalp. Bright bathroom. Cinematic close-up. Natural light. Soft focus background."
            className="w-full bg-white/5 border border-white/10 text-[#1d1d1f] placeholder-gray-600 rounded-xl p-3 text-sm focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        {/* Style (video only) */}
        {jobType === 'video' && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Style Preset</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStylePreset(s.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    stylePreset === s.id
                      ? 'bg-violet-600 border-violet-500 text-[#1d1d1f]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {s.label}
                  <span className="block text-[10px] opacity-60 mt-0.5">{s.credits} cr</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Character Reference */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Character Reference URL <span className="text-gray-600 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={charRefUrl}
            onChange={e => setCharRefUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 text-[#1d1d1f] placeholder-gray-600 rounded-xl p-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Credit estimate */}
        <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
          <span className="text-gray-400 text-sm">Estimated cost</span>
          <span className="text-violet-300 font-black">{estimatedCredits} credits</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="px-5 py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting || !prompt.trim()}
            className="flex-1 py-3 bg-violet-600 text-[#1d1d1f] font-black rounded-xl hover:bg-violet-500 transition-all disabled:opacity-40"
          >
            {submitting ? <Spinner /> : `Queue Job — ${estimatedCredits} cr`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Job Card ─────────────────────────────────────────────────────────────────

const JobCard: React.FC<{ job: VideoJob; onRefresh: () => void }> = ({ job, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    await supabase.from('video_jobs').delete().eq('id', job.id);
    onRefresh();
  };

  const handleRetry = async () => {
    await supabase.from('video_jobs').update({ status: 'queued', error_msg: null, result_url: null }).eq('id', job.id);
    onRefresh();
  };

  return (
    <div className="bg-black/[0.03] border border-black/[0.06] rounded-2xl p-4 space-y-3 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{job.brand}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500 capitalize">{job.job_type}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{job.style_preset}</span>
          </div>
          <p className="text-[#1d1d1f] text-sm font-medium line-clamp-2">{job.prompt}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {job.status === 'done' && job.result_url && (
        <div className="rounded-xl overflow-hidden bg-black border border-white/10">
          {job.job_type === 'video' ? (
            <video src={job.result_url} controls className="w-full max-h-48 object-contain" />
          ) : (
            <img src={job.result_url} alt="Generated" className="w-full max-h-48 object-contain" />
          )}
        </div>
      )}

      {job.status === 'failed' && job.error_msg && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">{job.error_msg}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-black/[0.04]">
        <span className="text-xs text-gray-600">
          {new Date(job.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {job.credits_used != null && ` · ${job.credits_used} cr used`}
        </span>
        <div className="flex items-center gap-2">
          {job.result_url && (
            <a
              href={job.result_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors"
            >
              Open ↗
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
          {job.status === 'failed' && (
            <button onClick={handleRetry} className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Retry
            </button>
          )}
          {(job.status === 'draft' || job.status === 'failed') && (
            <button onClick={handleDelete} className="text-xs text-red-500/60 hover:text-red-400 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-black/40 rounded-xl p-3 text-xs text-gray-400 space-y-1 font-mono">
          <div><span className="text-gray-600">prompt:</span> {job.prompt}</div>
          {job.character_ref_url && <div><span className="text-gray-600">char_ref:</span> {job.character_ref_url}</div>}
          <div><span className="text-gray-600">id:</span> {job.id}</div>
        </div>
      )}
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

const VideoGenerationView: React.FC = () => {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  const [filterBrand, setFilterBrand] = useState<Brand | 'all'>('all');

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setJobs(data as VideoJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll every 10s for processing jobs
    const interval = setInterval(() => {
      if (jobs.some(j => j.status === 'processing' || j.status === 'queued')) {
        fetchJobs();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('video_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_jobs' }, fetchJobs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const filtered = jobs.filter(j => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    if (filterBrand !== 'all' && j.brand !== filterBrand) return false;
    return true;
  });

  const counts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {} as Record<JobStatus, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#1d1d1f] font-black text-2xl tracking-tight">Video Generation</h2>
          <p className="text-gray-500 text-sm mt-0.5">Higgsfield AI — image & video jobs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-violet-600 text-[#1d1d1f] font-bold rounded-xl hover:bg-violet-500 transition-all text-sm"
        >
          + New Job
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-5 gap-3">
        {(['queued', 'processing', 'done', 'failed', 'draft'] as JobStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`bg-black/[0.03] border rounded-xl p-3 text-center transition-all ${
              filterStatus === s ? 'border-violet-500/50 bg-violet-500/10' : 'border-black/[0.06] hover:border-white/10'
            }`}
          >
            <div className={`text-2xl font-black ${STATUS_CONFIG[s].color}`}>{counts[s] || 0}</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest mt-0.5">{s}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value as Brand | 'all')}
          className="bg-white/5 border border-white/10 text-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="all" className="bg-[#111]">All Brands</option>
          {BRANDS.map(b => <option key={b} value={b} className="bg-[#111]">{b}</option>)}
        </select>
        {filterStatus !== 'all' && (
          <button
            onClick={() => setFilterStatus('all')}
            className="text-xs text-gray-500 hover:text-[#1d1d1f] transition-colors border border-white/10 rounded-xl px-3 py-2"
          >
            Clear filter ✕
          </button>
        )}
        <button
          onClick={fetchJobs}
          className="ml-auto text-xs text-gray-500 hover:text-[#1d1d1f] transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">No jobs yet. Create your first generation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} onRefresh={fetchJobs} />
          ))}
        </div>
      )}

      {showModal && (
        <NewJobModal onClose={() => setShowModal(false)} onCreated={fetchJobs} />
      )}
    </div>
  );
};

export default VideoGenerationView;
