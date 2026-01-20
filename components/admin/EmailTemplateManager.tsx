import React, { useState, useEffect } from 'react';
import { getEmailTemplates, updateEmailTemplate } from '../../lib/actions';
import type { EmailTemplate } from '../../types';
import Spinner from '../ui/Spinner';

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEmailTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSaving(true);
    const success = await updateEmailTemplate(
      selectedTemplate.id,
      selectedTemplate
    );
    if (success) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t))
      );
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-primary-600" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="md:col-span-4 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 px-2 mb-6">
          Templates
        </h2>
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplate(t)}
            className={`w-full text-left p-6 rounded-[2rem] glass-card transition-all ${selectedTemplate?.id === t.id ? 'border-primary-500 bg-primary-600/5 ring-2 ring-primary-500/20' : 'hover:bg-white'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-1">
              {t.slug}
            </p>
            <h4 className="font-black text-gray-900 dark:text-white truncate">
              {t.description}
            </h4>
          </button>
        ))}
        {templates.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-10">
            No templates found. Seed mock data to start.
          </p>
        )}
      </div>

      <div className="md:col-span-8">
        {selectedTemplate ? (
          <form
            onSubmit={handleSave}
            className="glass-card p-10 rounded-[3rem] space-y-8 animate-[fadeIn_0.3s_ease-out]"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                  Edit Template
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Slug: {selectedTemplate.slug}
                </p>
              </div>
              <div className="flex gap-2">
                {['full_name', 'status', 'company_name'].map((v) => (
                  <span
                    key={v}
                    className="text-[9px] font-black uppercase px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={selectedTemplate.subject}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      subject: e.target.value,
                    })
                  }
                  className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">
                  Body Content (HTML/Text)
                </label>
                <textarea
                  rows={10}
                  value={selectedTemplate.body}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      body: e.target.value,
                    })
                  }
                  className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary-500/30 flex items-center gap-2"
              >
                {saving && <Spinner className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-card p-20 rounded-[3rem] text-center flex flex-col items-center justify-center opacity-40">
            <svg
              className="w-16 h-16 text-gray-300 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              ></path>
            </svg>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">
              Select a template to edit
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplateManager;
