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
    task_completed: 'bg-green-100 text-green-700',
    task_assigned: 'bg-blue-100 text-blue-700',
    dispute: 'bg-red-100 text-red-700',
    invoice: 'bg-yellow-100 text-yellow-700',
    application: 'bg-purple-100 text-purple-700',
  };
  return map[type] ?? 'bg-gray-100 text-gray-600';
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Notification Feed</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {types.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  typeFilter === type
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type === 'all' ? 'Alle' : type}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Lade Benachrichtigungen...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
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
                  ? 'bg-white border border-gray-100 rounded-xl p-4 opacity-70'
                  : 'bg-blue-50 border-l-4 border-blue-400 rounded-xl p-4'
              }
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge(n.type)}`}>
                    {n.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{n.title}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {new Date(n.created_at).toLocaleString('de-DE')}
                </span>
              </div>

              {/* Body */}
              {n.body && (
                <p className="text-sm text-gray-600 mt-1">{n.body}</p>
              )}

              {/* Metadata */}
              {n.metadata && (
                <pre className="text-xs bg-gray-50 rounded-lg p-2 mt-2 text-gray-500 overflow-x-auto">
                  {JSON.stringify(n.metadata, null, 2)}
                </pre>
              )}

              {/* Bottom row */}
              {!n.read && (
                <div className="mt-3">
                  <button
                    className="px-3 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
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
