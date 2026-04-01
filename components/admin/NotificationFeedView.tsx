import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
  recipient_user_id: string | null;
};

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    task_completed: 'bg-emerald-500/15 text-emerald-400',
    task_assigned: 'bg-blue-500/15 text-blue-400',
    dispute: 'bg-red-500/15 text-red-400',
    invoice: 'bg-yellow-500/15 text-yellow-400',
    application: 'bg-violet-500/15 text-violet-400',
  };
  return map[type] ?? 'bg-slate-500/15 text-slate-400';
};

export default function NotificationFeedView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => {
    if (showUnreadOnly && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const types = ['all', ...Array.from(new Set(notifications.map(n => n.type)))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-800/60 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Notification Feed</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400 rounded-full">
                {unreadCount} ungelesen
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                onClick={markAllRead}
              >
                Alle als gelesen markieren
              </button>
            )}
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-surface-800/60 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.06] rounded-xl p-1">
            {types.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  typeFilter === type
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {type === 'all' ? 'Alle' : type}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={showUnreadOnly}
              onChange={e => setShowUnreadOnly(e.target.checked)}
            />
            Nur ungelesen
          </label>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">Lade Benachrichtigungen...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium">Keine Benachrichtigungen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              className={
                n.read
                  ? 'bg-surface-800/40 border border-white/[0.06] rounded-xl p-4 opacity-60'
                  : 'bg-blue-500/[0.08] border-l-4 border-blue-400 rounded-xl p-4'
              }
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge(n.type)}`}>
                    {n.type}
                  </span>
                  <span className="text-sm font-medium text-white">{n.title}</span>
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                  {new Date(n.created_at).toLocaleString('de-DE')}
                </span>
              </div>

              {/* Body */}
              {n.body && (
                <p className="text-sm text-slate-300 mt-1">{n.body}</p>
              )}

              {/* Metadata */}
              {n.metadata && (
                <pre className="text-xs bg-surface-900/60 rounded-lg p-2 mt-2 text-slate-500 overflow-x-auto">
                  {JSON.stringify(n.metadata, null, 2)}
                </pre>
              )}

              {/* Bottom row */}
              {!n.read && (
                <div className="mt-3">
                  <button
                    className="px-3 py-1 text-xs rounded-lg bg-white/[0.06] text-slate-400 hover:bg-white/[0.10]"
                    onClick={() => markRead(n.id)}
                  >
                    Als gelesen markieren
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
