import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AddInternModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const DEPARTMENTS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'support', label: 'Customer Support' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'finance', label: 'Finance' },
  { value: 'recruiting', label: 'Recruiting' },
];

const BRANDS = [
  { value: '', label: '— Kein Brand —' },
  { value: 'thiocyn', label: 'Thiocyn' },
  { value: 'take-a-shot', label: 'Take A Shot' },
  { value: 'paigh', label: 'Paigh' },
  { value: 'dr-severin', label: 'Dr. Severin' },
  { value: 'wristr', label: 'Wristr' },
  { value: 'timber-john', label: 'Timber & John' },
];

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (günstig, schnell)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet (leistungsstärker)' },
];

const AddInternModal: React.FC<AddInternModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    department: 'marketing',
    assigned_brand: '',
    budget_tokens_monthly: 0,
    model: 'claude-haiku-4-5-20251001',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key: string, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, E-Mail und Passwort sind Pflichtfelder.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('academy-create-intern', {
        body: {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          department: form.department,
          assigned_brand: form.assigned_brand || null,
          budget_tokens_monthly: form.budget_tokens_monthly,
          model: form.model,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Fehler beim Erstellen des Accounts.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Intern hinzufügen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {[
            { key: 'full_name', label: 'Vollständiger Name', type: 'text', placeholder: 'Max Mustermann' },
            { key: 'email', label: 'E-Mail Adresse', type: 'email', placeholder: 'max@hartlimes.de' },
            { key: 'password', label: 'Temporäres Passwort', type: 'password', placeholder: 'Mindestens 8 Zeichen' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form] as string}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-700/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Department</label>
            <select
              value={form.department}
              onChange={e => update('department', e.target.value)}
              className="w-full bg-slate-700/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {DEPARTMENTS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Zugewiesene Brand (optional)</label>
            <select
              value={form.assigned_brand}
              onChange={e => update('assigned_brand', e.target.value)}
              className="w-full bg-slate-700/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {BRANDS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Monatliches Token-Budget: {Number(form.budget_tokens_monthly).toLocaleString()}
            </label>
            <input
              type="range"
              min={0}
              max={2000000}
              step={100000}
              value={form.budget_tokens_monthly}
              onChange={e => update('budget_tokens_monthly', Number(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0 (gesperrt)</span>
              <span>1M</span>
              <span>2M</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Modell</label>
            <select
              value={form.model}
              onChange={e => update('model', e.target.value)}
              className="w-full bg-slate-700/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Erstelle Account…' : 'Intern erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInternModal;
