import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

type Role = 'owner' | 'admin' | 'creative' | 'hiring' | 'support' | 'viewer';
type MemberStatus = 'pending' | 'active' | 'deactivated';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  allowed_sections: string[];
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
}

const ALL_SECTIONS = ['command', 'creative', 'revenue', 'hiring', 'finance', 'support', 'admin'];

const SECTION_LABELS: Record<string, string> = {
  command: 'Command Center',
  creative: 'Creative Studio',
  revenue: 'Revenue & Analytics',
  hiring: 'Hiring & Academy',
  finance: 'Finance',
  support: 'Support',
  admin: 'Admin',
};

const ROLE_BADGE_COLORS: Record<Role, string> = {
  owner: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  admin: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  creative: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  hiring: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  support: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  viewer: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

const STATUS_BADGE_COLORS: Record<MemberStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  deactivated: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

const ROLE_DESCRIPTIONS: { role: Role; desc: string }[] = [
  { role: 'owner', desc: 'Full access including team management' },
  { role: 'admin', desc: 'All sections, cannot manage team' },
  { role: 'creative', desc: 'Creative Studio + Command Center' },
  { role: 'hiring', desc: 'Hiring & Academy + Command Center' },
  { role: 'support', desc: 'Support + Command Center' },
  { role: 'viewer', desc: 'Read-only access to assigned sections' },
];

const SELECTABLE_SECTIONS = ['command', 'creative', 'revenue', 'hiring', 'finance', 'support'];

function getDefaultSections(role: Role): string[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return ALL_SECTIONS;
    case 'creative':
      return ['command', 'creative'];
    case 'hiring':
      return ['command', 'hiring'];
    case 'support':
      return ['command', 'support'];
    default:
      return ['command'];
  }
}

const rolesFullAccess: Role[] = ['owner', 'admin'];

const TeamManagementView: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');
  const [inviteSections, setInviteSections] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<Role>('viewer');
  const [editSections, setEditSections] = useState<string[]>([]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at');
    if (!error && data) {
      setMembers(data as TeamMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = (role: Role) => {
    setInviteRole(role);
    setInviteSections(getDefaultSections(role));
  };

  const toggleInviteSection = (section: string) => {
    setInviteSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    const sections = rolesFullAccess.includes(inviteRole) ? ALL_SECTIONS : inviteSections;
    const { error } = await supabase.from('team_members').insert({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      allowed_sections: sections,
      status: 'pending',
      invited_by: 'admin',
    });
    if (error) {
      toast.error('Failed to send invite: ' + error.message);
    } else {
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRole('viewer');
      setInviteSections([]);
      await fetchMembers();
    }
    setIsInviting(false);
  };

  const handleDeactivate = async (member: TeamMember) => {
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'deactivated' })
      .eq('id', member.id);
    if (error) {
      toast.error('Failed to deactivate member');
    } else {
      toast.success(`${member.email} deactivated`);
      await fetchMembers();
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditSections(member.allowed_sections);
  };

  const handleEditRoleChange = (role: Role) => {
    setEditRole(role);
    setEditSections(getDefaultSections(role));
  };

  const toggleEditSection = (section: string) => {
    setEditSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    const sections = rolesFullAccess.includes(editRole) ? ALL_SECTIONS : editSections;
    const { error } = await supabase
      .from('team_members')
      .update({ role: editRole, allowed_sections: sections })
      .eq('id', editingMember.id);
    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Member updated');
      setEditingMember(null);
      await fetchMembers();
    }
  };

  const showSectionCheckboxes = !rolesFullAccess.includes(inviteRole);

  return (
    <div className="max-w-4xl space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tighter">Team Management</h2>
        <p className="text-sm text-slate-500 mt-1">Invite people and manage access</p>
      </div>

      {/* Invite Form */}
      <div className="border border-white/[0.06] rounded-2xl p-6 bg-surface-800/60 backdrop-blur-sm space-y-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Invite a team member</h3>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full px-4 py-3 rounded-xl border border-white/[0.10] bg-white/[0.04] text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role</label>
          <select
            value={inviteRole}
            onChange={e => handleRoleChange(e.target.value as Role)}
            className="w-full px-4 py-3 rounded-xl border border-white/[0.10] bg-white/[0.04] text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 text-slate-100"
          >
            <option value="viewer">Viewer</option>
            <option value="hiring">Hiring</option>
            <option value="creative">Creative</option>
            <option value="support">Support</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        {showSectionCheckboxes && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Section access</label>
            <div className="flex flex-wrap gap-3">
              {SELECTABLE_SECTIONS.map(section => (
                <label key={section} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteSections.includes(section)}
                    onChange={() => toggleInviteSection(section)}
                    className="rounded border-white/[0.10] text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="text-sm font-medium text-slate-300">{SECTION_LABELS[section]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleInvite}
          disabled={isInviting || !inviteEmail.trim()}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
        >
          {isInviting ? 'Sending...' : 'Send Invite'}
        </button>
      </div>

      {/* Members Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Team members</h3>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No team members yet.</div>
        ) : (
          <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-surface-800/60 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-900/60">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Name / Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Sections</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {members.map(member => (
                  editingMember?.id === member.id ? (
                    <tr key={member.id} className="bg-amber-500/10">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{member.full_name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={editRole}
                          onChange={e => handleEditRoleChange(e.target.value as Role)}
                          className="px-3 py-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] text-sm font-medium text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/30"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="hiring">Hiring</option>
                          <option value="creative">Creative</option>
                          <option value="support">Support</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {rolesFullAccess.includes(editRole) ? (
                          <span className="text-xs text-slate-500 italic">All sections</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {SELECTABLE_SECTIONS.map(section => (
                              <label key={section} className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editSections.includes(section)}
                                  onChange={() => toggleEditSection(section)}
                                  className="rounded border-white/[0.10] text-amber-500"
                                />
                                <span className="text-xs text-slate-300">{SECTION_LABELS[section]}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_COLORS[member.status]}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 text-xs font-bold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={member.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{member.full_name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_BADGE_COLORS[member.role]}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {rolesFullAccess.includes(member.role) ? (
                          <span className="text-xs text-slate-500 italic">All sections</span>
                        ) : member.allowed_sections.length === 0 ? (
                          <span className="text-xs text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {member.allowed_sections.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-slate-500/15 text-slate-400 text-[10px] font-semibold rounded-full border border-white/[0.06]">
                                {SECTION_LABELS[s] ?? s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_COLORS[member.status]}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(member)}
                            className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 text-xs font-bold rounded-lg transition-all"
                          >
                            Edit
                          </button>
                          {member.role !== 'owner' && member.status !== 'deactivated' && (
                            <button
                              onClick={() => handleDeactivate(member)}
                              className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-lg transition-all border border-red-500/20"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="border border-white/[0.06] rounded-2xl p-5 bg-surface-900/60 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Role reference</p>
        {ROLE_DESCRIPTIONS.map(({ role, desc }) => (
          <div key={role} className="flex items-start gap-3">
            <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${ROLE_BADGE_COLORS[role]}`}>
              {role}
            </span>
            <span className="text-xs text-slate-300">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManagementView;
