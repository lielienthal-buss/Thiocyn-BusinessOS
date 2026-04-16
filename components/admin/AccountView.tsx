import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type Role = 'owner' | 'admin' | 'creative' | 'hiring' | 'support' | 'viewer';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  allowed_sections: string[];
  status: string;
  created_at: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner:     'bg-violet-50 text-violet-700 border-violet-200',
  admin:     'bg-amber-50 text-amber-700 border-amber-200',
  marketing: 'bg-pink-50 text-pink-700 border-pink-200',
  hiring:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  support:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  viewer:    'bg-slate-100 text-slate-600 border-slate-200',
};

interface Props {
  session: Session | null;
}

const AccountView: React.FC<Props> = ({ session }) => {
  const NOTIF_DEFAULTS: Record<string, boolean> = {
    'Task completed by intern': true,
    'New check-in submitted': true,
    'New application received': false,
    'Slack notifications': false,
    'WhatsApp notifications': false,
  };
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem('notif_prefs') ?? '{}') }; }
    catch { return NOTIF_DEFAULTS; }
  });
  const toggleNotif = (label: string) => {
    setNotifPrefs(p => {
      const next = { ...p, [label]: !p[label] };
      localStorage.setItem('notif_prefs', JSON.stringify(next));
      return next;
    });
  };
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) { setLoading(false); return; }
    supabase
      .from('team_members')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle()
      .then(({ data }) => {
        setMember(data);
        setEditName(data?.full_name ?? '');
        setLoading(false);
      });
  }, [session]);

  const initials = (member?.full_name ?? session?.user?.email ?? '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveName = async () => {
    if (!session?.user?.email) return;
    setSaving(true);
    if (member) {
      await supabase.from('team_members').update({ full_name: editName }).eq('id', member.id);
      setMember(m => m ? { ...m, full_name: editName } : m);
    } else {
      // First save: create a team_members row for this auth user
      const { data } = await supabase
        .from('team_members')
        .upsert({ email: session.user.email, full_name: editName, role: 'admin', status: 'active', allowed_sections: [] }, { onConflict: 'email' })
        .select()
        .maybeSingle();
      if (data) setMember(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (pwNew !== pwConfirm) { setPwError('Passwords do not match.'); return; }
    if (pwNew.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwSaved(true);
    setPwNew(''); setPwConfirm('');
    setTimeout(() => setPwSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">

      {/* Profile Card */}
      <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-sm">
            {initials}
          </div>
          <div>
            <p className="font-black text-slate-900 text-lg leading-tight">
              {member?.full_name ?? 'No name set'}
            </p>
            <p className="text-sm text-slate-500">{session?.user?.email}</p>
            <span className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${ROLE_BADGE[member?.role ?? 'viewer'] ?? ROLE_BADGE.viewer}`}>
              {member?.role ?? 'viewer'}
            </span>
          </div>
        </div>

        {/* Edit Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={e => { setEditName(e.target.value); setSaved(false); }}
              placeholder="Your full name"
              className="flex-1 border border-slate-200 bg-white text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || editName === (member?.full_name ?? '') || !editName.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
            >
              {saving ? '...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={session?.user?.email ?? ''}
            readOnly
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-slate-500">Email changes require admin approval.</p>
        </div>
      </div>

      {/* Access & Permissions */}
      {member && (
        <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Access & Permissions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Role</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${ROLE_BADGE[member.role] ?? ROLE_BADGE.viewer}`}>
                {member.role}
              </span>
            </div>
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-slate-600 shrink-0">Sections</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {(member.allowed_sections?.length > 0 ? member.allowed_sections : ['all']).map(s => (
                  <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full border border-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {member.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Member since</span>
              <span className="text-slate-700 font-medium">
                {new Date(member.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-4">To change role or section access, contact an admin.</p>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Change Password</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">New Password</label>
            <input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-slate-200 bg-white text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              placeholder="Repeat new password"
              className="w-full border border-slate-200 bg-white text-slate-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400"
            />
          </div>
          {pwError && <p className="text-xs text-rose-600 font-medium">{pwError}</p>}
          {pwSaved && <p className="text-xs text-emerald-600 font-semibold">✓ Password updated successfully.</p>}
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !pwNew || !pwConfirm}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notification Preferences</h2>
        </div>
        <div className="space-y-3">
          {Object.keys(NOTIF_DEFAULTS).map(label => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{label}</span>
              <button
                onClick={() => toggleNotif(label)}
                className={`w-9 h-5 rounded-full relative transition-colors ${notifPrefs[label] ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs[label] ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 pb-4">
        Business OS
      </p>
    </div>
  );
};

export default AccountView;
