import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type Role = 'owner' | 'admin' | 'marketing' | 'hiring' | 'support' | 'viewer';

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
  owner:     'bg-purple-100 text-purple-700 border-purple-200',
  admin:     'bg-amber-100 text-amber-700 border-amber-200',
  marketing: 'bg-pink-100 text-pink-700 border-pink-200',
  hiring:    'bg-blue-100 text-blue-700 border-blue-200',
  support:   'bg-green-100 text-green-700 border-green-200',
  viewer:    'bg-gray-100 text-gray-600 border-gray-200',
};

interface Props {
  session: Session | null;
}

const AccountView: React.FC<Props> = ({ session }) => {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [pwCurrent, setPwCurrent] = useState('');
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
    if (!member) return;
    setSaving(true);
    await supabase.from('team_members').update({ full_name: editName }).eq('id', member.id);
    setMember(m => m ? { ...m, full_name: editName } : m);
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
    setPwCurrent(''); setPwNew(''); setPwConfirm('');
    setTimeout(() => setPwSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">

      {/* Profile Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-black shadow-sm">
            {initials}
          </div>
          <div>
            <p className="font-black text-gray-900 text-lg leading-tight">
              {member?.full_name ?? 'No name set'}
            </p>
            <p className="text-sm text-gray-400">{session?.user?.email}</p>
            <span className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${ROLE_BADGE[member?.role ?? 'viewer'] ?? ROLE_BADGE.viewer}`}>
              {member?.role ?? 'viewer'}
            </span>
          </div>
        </div>

        {/* Edit Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={e => { setEditName(e.target.value); setSaved(false); }}
              placeholder="Your full name"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || editName === (member?.full_name ?? '')}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
            >
              {saving ? '...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={session?.user?.email ?? ''}
            readOnly
            className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-[11px] text-gray-400">Email changes require admin approval.</p>
        </div>
      </div>

      {/* Access & Permissions */}
      {member && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Access & Permissions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${ROLE_BADGE[member.role] ?? ROLE_BADGE.viewer}`}>
                {member.role}
              </span>
            </div>
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-gray-500 shrink-0">Sections</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {(member.allowed_sections?.length > 0 ? member.allowed_sections : ['all']).map(s => (
                  <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                member.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {member.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Member since</span>
              <span className="text-gray-700 font-medium">
                {new Date(member.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4">To change role or section access, contact an admin.</p>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Change Password</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">New Password</label>
            <input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              placeholder="Repeat new password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
            />
          </div>
          {pwError && <p className="text-xs text-red-500 font-medium">{pwError}</p>}
          {pwSaved && <p className="text-xs text-green-600 font-semibold">✓ Password updated successfully.</p>}
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !pwNew || !pwConfirm}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Notification Preferences — scaffold, wire up with Valentin */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm opacity-60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Notification Preferences</h2>
          <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">Coming soon</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Task completed by intern', defaultOn: true },
            { label: 'New check-in submitted', defaultOn: true },
            { label: 'New application received', defaultOn: false },
            { label: 'Slack notifications', defaultOn: false },
            { label: 'WhatsApp notifications', defaultOn: false },
          ].map(pref => (
            <div key={pref.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{pref.label}</span>
              <div className={`w-9 h-5 rounded-full relative cursor-not-allowed ${pref.defaultOn ? 'bg-primary-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pref.defaultOn ? 'left-4' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Business OS
      </p>
    </div>
  );
};

export default AccountView;
