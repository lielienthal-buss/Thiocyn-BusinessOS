import React, { useEffect, useState } from 'react';
import ResourceCardList from './ResourceCardList';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  isAdmin: boolean;
}

interface InternAccount {
  full_name: string;
  email: string;
  is_active: boolean;
}

const BRAND_CS: {
  name: string;
  status: 'active' | 'paused' | 'external';
  statusLabel: string;
  accent: string;
  links: { label: string; url: string }[];
}[] = [
  {
    name: 'Take A Shot',
    status: 'external',
    statusLabel: 'Extern (~300€/mo)',
    accent: '#F59E0B',
    links: [],
  },
  {
    name: 'Thiocyn',
    status: 'active',
    statusLabel: 'Aktiv',
    accent: '#A78BFA',
    links: [],
  },
  {
    name: 'Paigh',
    status: 'active',
    statusLabel: 'Aktiv',
    accent: '#F43F5E',
    links: [],
  },
  {
    name: 'Dr. Severin',
    status: 'active',
    statusLabel: 'Aktiv',
    accent: '#38BDF8',
    links: [],
  },
  {
    name: 'Timber & John',
    status: 'paused',
    statusLabel: 'Seasonal Pause',
    accent: '#4ADE80',
    links: [],
  },
];

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  external: 'bg-blue-50 text-blue-700 border-blue-200',
};

const CustomerSupportView: React.FC<Props> = ({ isAdmin }) => {
  const [team, setTeam] = useState<InternAccount[]>([]);

  useEffect(() => {
    supabase
      .from('intern_accounts')
      .select('full_name, email, is_active')
      .eq('department', 'support')
      .eq('is_active', true)
      .then(({ data }) => { if (data) setTeam(data); });
  }, []);

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Customer Support</h2>
        <p className="text-sm text-gray-500 mt-0.5">Brand-Status, Team und Quick-Links</p>
      </div>

      {/* Quick Access — cross-brand */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Support GPT Copilot', url: 'https://chatgpt.com/g/g-69b81f81bd948191878ebbfc21374a5e-support-ticket-copilot' },
          { label: 'Support SOPs', url: 'https://docs.google.com/document/d/1U8PS1IiD7IBhCVOXnWBqIsJXqnAptODc/edit' },
          { label: 'Solved Ticket Sheet', url: 'https://docs.google.com/spreadsheets/d/10c0mJ30CYAPilgb1sJ8mPk9YahGr8jpy6eVXy2F-gKg/edit' },
          { label: 'Returns — Viking', url: 'https://docs.google.com/spreadsheets/d/1bopEmzQ-Wga5kYckw187F7Cm1IuNq5KgR7gZCFMSbyw/edit' },
        ].map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors text-xs font-semibold text-gray-700"
          >
            <span className="text-gray-400">↗</span>
            {link.label}
          </a>
        ))}
      </div>

      {/* Brand CS Status Grid */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3">Brand Status</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BRAND_CS.map(brand => (
            <div
              key={brand.name}
              className="rounded-xl border border-gray-100 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: brand.accent }} />
                  <span className="font-black text-sm text-gray-900">{brand.name}</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[brand.status]}`}>
                  {brand.statusLabel}
                </span>
              </div>
              {brand.links.length > 0 && (
                <div className="space-y-1">
                  {brand.links.map(link => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <span className="text-gray-300">→</span>
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CS Team */}
      {team.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3">CS Team ({team.length} aktiv)</p>
          <div className="flex flex-wrap gap-2">
            {team.map(intern => (
              <div key={intern.email} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                  {intern.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{intern.full_name}</div>
                  <div className="text-[10px] text-gray-400">{intern.email}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Support-Mailaccounts: support1–5@mail.hartlimesgmbh.de
          </p>
        </div>
      )}

      {/* KPI Targets */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3">KPI Targets</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'First Response', target: '≤ 24h' },
            { label: 'WhatsApp Reply', target: '< 4h (Mo–Fr)' },
            { label: 'Standup', target: 'Mo bis 10:00' },
            { label: 'Escalation Rate', target: '≤ 10%' },
          ].map(kpi => (
            <div key={kpi.label} className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">{kpi.label}</div>
              <div className="text-sm font-black text-gray-900 mt-0.5">{kpi.target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3">Ressourcen</p>
        <ResourceCardList section="support" isAdmin={isAdmin} />
      </div>
    </div>
  );
};

export default CustomerSupportView;
