import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';

type KnowledgeEntry = {
  id: string;
  brand_slug: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const catColors = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function getCatColor(categories: string[], category: string): string {
  const idx = categories.indexOf(category);
  return catColors[idx % catColors.length];
}

type EditState = {
  id: string;
  title: string;
  content: string;
  tags: string;
  category: string;
};

export default function KnowledgeBaseView() {
  const { activeBrand } = useBrand();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [filtered, setFiltered] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from('knowledge_entries')
        .select('*')
        .eq('active', true)
        .order('updated_at', { ascending: false });
      if (activeBrand?.slug) q = q.eq('brand_slug', activeBrand.slug);
      const { data } = await q;
      setEntries((data ?? []) as KnowledgeEntry[]);
      setLoading(false);
    };
    load();
  }, [activeBrand]);

  useEffect(() => {
    const q = search.toLowerCase();
    let result = entries.filter((e) => {
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        (e.tags ?? []).join(' ').toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    setFiltered(result);
  }, [entries, search, categoryFilter]);

  const categories = Array.from(new Set(entries.map((e) => e.category))).filter(Boolean) as string[];

  const uniqueCategories = Array.from(
    new Set(filtered.map((e) => e.category))
  ).filter(Boolean);

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditState({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      tags: (entry.tags ?? []).join(', '),
      category: entry.category,
    });
  };

  const handleSave = async () => {
    if (!editState) return;
    setSaving(true);
    const tags = editState.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from('knowledge_entries')
      .update({
        title: editState.title,
        content: editState.content,
        tags,
        category: editState.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editState.id);
    if (!error) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editState.id
            ? {
                ...e,
                title: editState.title,
                content: editState.content,
                tags,
                category: editState.category,
                updated_at: new Date().toISOString(),
              }
            : e
        )
      );
    }
    setSaving(false);
    setEditState(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="text-lg font-semibold text-gray-800 shrink-0">Knowledge Base</h2>
        <input
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Suchen nach Titel, Inhalt oder Tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Alle Kategorien</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>
          <span className="font-medium text-gray-700">{filtered.length}</span> Einträge
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-medium text-gray-700">{uniqueCategories.length}</span> Kategorien
        </span>
        {activeBrand?.slug && (
          <>
            <span className="text-gray-300">|</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {activeBrand.slug}
            </span>
          </>
        )}
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Laden…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">Keine Einträge gefunden.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const isExpanded = expanded === entry.id;
            const catColor = getCatColor(categories, entry.category);
            const preview =
              entry.content.length > 120
                ? entry.content.slice(0, 120) + '…'
                : entry.content;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 relative group"
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Entry header */}
                <div
                  className="flex flex-wrap items-center gap-2 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                >
                  {entry.category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColor}`}>
                      {entry.category}
                    </span>
                  )}
                  {entry.brand_slug && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {entry.brand_slug}
                    </span>
                  )}
                  <span className="font-medium text-gray-800 text-sm">{entry.title}</span>
                  <span className="text-xs text-gray-400">v{entry.version}</span>
                  {entry.source && (
                    <span className="text-xs text-gray-400">· {entry.source}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(entry.updated_at).toLocaleDateString('de-DE')}
                  </span>
                </div>

                {/* Tags */}
                {(entry.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(entry.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div
                  className="mt-2 text-sm text-gray-600 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                >
                  {isExpanded ? (
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                  ) : (
                    <p>{preview}</p>
                  )}
                </div>

                {/* Edit button (shown on hover) */}
                {hoveredId === entry.id && (
                  <button
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(entry);
                    }}
                  >
                    Bearbeiten
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
              setEditState(null);
            }
          }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-lg space-y-4"
          >
            <h3 className="text-base font-semibold text-gray-800">Eintrag bearbeiten</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editState.title}
                  onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editState.category}
                  onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Inhalt</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  rows={8}
                  value={editState.content}
                  onChange={(e) => setEditState({ ...editState, content: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tags <span className="font-normal text-gray-400">(kommagetrennt)</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editState.tags}
                  onChange={(e) => setEditState({ ...editState, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setEditState(null)}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
