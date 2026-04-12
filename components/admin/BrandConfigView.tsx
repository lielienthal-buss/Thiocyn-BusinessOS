import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Integration Secrets Section ──────────────────────────────────────────
// Secure secret management via manage-secrets Edge Function.
// Values are never returned to the frontend — only "configured" status.

const INTEGRATIONS = [
  { integration: 'shopify', keys: ['access_token', 'store_url'], label: 'Shopify' },
  { integration: 'meta', keys: ['access_token', 'app_secret'], label: 'Meta Ads' },
  { integration: 'tiktok', keys: ['access_token'], label: 'TikTok' },
  { integration: 'google', keys: ['api_key'], label: 'Google Ads' },
];

function IntegrationSecretsSection({ brandSlug }: { brandSlug: string }) {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-secrets', {
        body: { action: 'list', brand_slug: brandSlug },
      });
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const s of (data?.secrets ?? [])) {
        map[`${s.integration}:${s.key_name}`] = true;
      }
      setConfigured(map);
    } catch {
      // Silent fail — user might not have permissions
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); setInputValues({}); }, [brandSlug]);

  const handleSave = async (integration: string, keyName: string) => {
    const value = inputValues[`${integration}:${keyName}`];
    if (!value?.trim()) return;
    setSaving(`${integration}:${keyName}`);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-secrets', {
        body: { action: 'set', brand_slug: brandSlug, integration, key_name: keyName, value: value.trim() },
      });
      if (error) throw error;
      setMessage(data?.message ?? 'Gespeichert');
      setInputValues(prev => ({ ...prev, [`${integration}:${keyName}`]: '' }));
      await loadStatus();
    } catch (err) {
      setMessage(`Fehler: ${String(err)}`);
    }
    setSaving(null);
  };

  const handleDelete = async (integration: string, keyName: string) => {
    if (!confirm(`${integration}/${keyName} für ${brandSlug} wirklich löschen?`)) return;
    setSaving(`${integration}:${keyName}`);
    try {
      await supabase.functions.invoke('manage-secrets', {
        body: { action: 'delete', brand_slug: brandSlug, integration, key_name: keyName },
      });
      await loadStatus();
    } catch {}
    setSaving(null);
  };

  if (loading) return <div className="text-sm text-[#6e6e73] py-4">Lade Integrations...</div>;

  return (
    <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">Integration Secrets</h3>
      <p className="text-xs text-[#6e6e73] mb-4">
        API Keys werden verschlüsselt gespeichert. Werte werden nie angezeigt — nur der Status.
      </p>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs text-emerald-400 mb-3">
          {message}
        </div>
      )}

      {INTEGRATIONS.map(({ integration, keys, label }) => (
        <div key={integration} className="mb-4 last:mb-0">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#515154] mb-2">{label}</h4>
          <div className="flex flex-col gap-2">
            {keys.map(keyName => {
              const fullKey = `${integration}:${keyName}`;
              const isConfigured = configured[fullKey];
              const isSaving = saving === fullKey;

              return (
                <div key={fullKey} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-[#6e6e73] mb-0.5">{keyName}</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={inputValues[fullKey] ?? ''}
                        onChange={e => setInputValues(prev => ({ ...prev, [fullKey]: e.target.value }))}
                        placeholder={isConfigured ? '••••••••  (konfiguriert)' : 'Nicht konfiguriert'}
                        className="flex-1 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                      />
                      <button
                        onClick={() => handleSave(integration, keyName)}
                        disabled={isSaving || !inputValues[fullKey]?.trim()}
                        className="px-3 py-1.5 bg-blue-600 text-[#1d1d1f] rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-30 transition-colors"
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                      {isConfigured && (
                        <button
                          onClick={() => handleDelete(integration, keyName)}
                          className="px-2 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-colors"
                          title="Secret löschen"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-bold mt-4 ${isConfigured ? 'text-green-400' : 'text-[#86868b]'}`}>
                    {isConfigured ? '✓' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

type Brand = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  color: string;
  status: string;
};

type BrandConfig = {
  id?: string;
  brand_slug: string;
  shopify_store_url?: string;
  shopify_api_key_ref?: string;
  shopify_webhook_secret_ref?: string;
  meta_ad_account_id?: string;
  meta_pixel_id?: string;
  meta_page_id?: string;
  meta_credential_ref?: string;
  tiktok_ad_account_id?: string;
  tiktok_credential_ref?: string;
  cs_email?: string;
  paigh_inbox_id?: string;
  sender_email?: string;
  resend_domain_ref?: string;
  amazon_seller_id?: string;
  billbee_shop_id?: string;
  notes?: string;
  updated_at?: string;
};

export default function BrandConfigView() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [configs, setConfigs] = useState<Record<string, BrandConfig>>({});
  const [activeBrandSlug, setActiveBrandSlug] = useState<string | null>(null);
  const [editState, setEditState] = useState<Partial<BrandConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [br, bc] = await Promise.all([
        supabase.from('brands').select('id, slug, name, emoji, color, status').order('name'),
        supabase.from('brand_configs').select('*'),
      ]);

      const brandsData: Brand[] = br.data ?? [];
      setBrands(brandsData);

      const map: Record<string, BrandConfig> = {};
      bc.data?.forEach((c) => (map[c.brand_slug] = c));
      setConfigs(map);

      if (brandsData.length > 0) {
        setActiveBrandSlug(brandsData[0].slug);
      }

      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (activeBrandSlug) {
      setEditState(configs[activeBrandSlug] ?? { brand_slug: activeBrandSlug });
    }
  }, [activeBrandSlug, configs]);

  const handleChange = (field: keyof BrandConfig, value: string) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!activeBrandSlug) return;
    setSaving(true);
    const existing = configs[activeBrandSlug];
    if (existing) {
      await supabase
        .from('brand_configs')
        .update({ ...editState, updated_at: new Date().toISOString() })
        .eq('brand_slug', activeBrandSlug);
    } else {
      await supabase
        .from('brand_configs')
        .insert({ ...editState, brand_slug: activeBrandSlug });
    }
    setSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);

    const { data } = await supabase.from('brand_configs').select('*');
    const map: Record<string, BrandConfig> = {};
    data?.forEach((c) => (map[c.brand_slug] = c));
    setConfigs(map);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-[#6e6e73]">
        Lade Konfigurationen…
      </div>
    );
  }

  const activeBrand = brands.find((b) => b.slug === activeBrandSlug);

  return (
    <div className="flex gap-4 h-full">
      {/* Left Sidebar */}
      <div className="w-48 shrink-0 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Brands</h3>
        {brands.map((brand) => (
          <button
            key={brand.slug}
            onClick={() => setActiveBrandSlug(brand.slug)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
              activeBrandSlug === brand.slug
                ? 'bg-[#E09B37]/12 text-[#E09B37] border border-[#E09B37]/25 font-medium'
                : 'text-[#1d1d1f] hover:bg-black/[0.03]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                brand.status === 'active' ? 'bg-green-500' : 'bg-slate-600'
              }`}
            />
            <span className="mr-1">{brand.emoji}</span>
            <span className="truncate">{brand.name}</span>
          </button>
        ))}
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto">
        {activeBrand ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1d1d1f]">
                {activeBrand.emoji} {activeBrand.name} — Konfiguration
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setEditState(
                      configs[activeBrandSlug!] ?? { brand_slug: activeBrandSlug! }
                    )
                  }
                  className="px-4 py-2 bg-black/[0.04] text-[#1d1d1f] rounded-xl text-sm font-medium hover:bg-white/[0.10]"
                >
                  Abbrechen
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-[#1d1d1f] rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>

            {/* Integration Secrets (secure) — TOP PRIORITY */}
            <IntegrationSecretsSection brandSlug={activeBrandSlug!} />

            {/* Section 1 — Shopify (non-secret config) */}
            <div className="bg-slate-500/5 border border-slate-500/10 rounded-xl p-3 text-xs text-[#515154]">
              Die Felder unten sind für nicht-sensible Konfiguration (Store URLs, Account IDs). API Keys gehören in die Integration Secrets oben.
            </div>
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Shopify</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Shopify Store URL
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.shopify_store_url ?? ''}
                    onChange={(e) => handleChange('shopify_store_url', e.target.value)}
                    placeholder="mystore.myshopify.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    API Key Ref
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.shopify_api_key_ref ?? ''}
                    onChange={(e) => handleChange('shopify_api_key_ref', e.target.value)}
                    placeholder="Env var name, not the key itself"
                  />
                  <p className="text-xs text-[#6e6e73] mt-1">Env var name, not the key itself</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Webhook Secret Ref
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.shopify_webhook_secret_ref ?? ''}
                    onChange={(e) =>
                      handleChange('shopify_webhook_secret_ref', e.target.value)
                    }
                    placeholder="Env var name"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 — Meta Ads */}
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Meta Ads</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Ad Account ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.meta_ad_account_id ?? ''}
                    onChange={(e) => handleChange('meta_ad_account_id', e.target.value)}
                    placeholder="act_XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Pixel ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.meta_pixel_id ?? ''}
                    onChange={(e) => handleChange('meta_pixel_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Page ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.meta_page_id ?? ''}
                    onChange={(e) => handleChange('meta_page_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Credential Ref
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.meta_credential_ref ?? ''}
                    onChange={(e) => handleChange('meta_credential_ref', e.target.value)}
                    placeholder="Env var name"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 — Other Platforms */}
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Other Platforms</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    TikTok Ad Account ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.tiktok_ad_account_id ?? ''}
                    onChange={(e) => handleChange('tiktok_ad_account_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    TikTok Credential Ref
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.tiktok_credential_ref ?? ''}
                    onChange={(e) => handleChange('tiktok_credential_ref', e.target.value)}
                    placeholder="Env var name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Amazon Seller ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.amazon_seller_id ?? ''}
                    onChange={(e) => handleChange('amazon_seller_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Billbee Shop ID
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.billbee_shop_id ?? ''}
                    onChange={(e) => handleChange('billbee_shop_id', e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Section 4 — Communication */}
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Communication</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    CS Email
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.cs_email ?? ''}
                    onChange={(e) => handleChange('cs_email', e.target.value)}
                    placeholder="support@brand.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Sender Email
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.sender_email ?? ''}
                    onChange={(e) => handleChange('sender_email', e.target.value)}
                    placeholder="hello@brand.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                    Resend Domain Ref
                  </label>
                  <input
                    className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                    value={editState.resend_domain_ref ?? ''}
                    onChange={(e) => handleChange('resend_domain_ref', e.target.value)}
                    placeholder="Env var name"
                  />
                </div>
                {activeBrandSlug === 'paigh' && (
                  <div>
                    <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                      Paigh Inbox ID
                    </label>
                    <input
                      className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                      value={editState.paigh_inbox_id ?? ''}
                      onChange={(e) => handleChange('paigh_inbox_id', e.target.value)}
                      placeholder="inbox_XXXXXXXXXX"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Notizen</h3>
              <textarea
                className="w-full bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-xl px-3 py-2 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-[#86868b]"
                value={editState.notes ?? ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Interne Notizen zur Brand-Konfiguration…"
              />
            </div>

            {/* Security Notice updated */}

            {/* Bottom save bar */}
            <div className="flex justify-end gap-2 pb-4">
              <button
                onClick={() =>
                  setEditState(
                    configs[activeBrandSlug!] ?? { brand_slug: activeBrandSlug! }
                  )
                }
                className="px-4 py-2 bg-black/[0.04] text-[#1d1d1f] rounded-xl text-sm font-medium hover:bg-white/[0.10]"
              >
                Abbrechen
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-[#1d1d1f] rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-[#6e6e73]">
            Wähle eine Brand aus der Liste.
          </div>
        )}
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-[#1d1d1f] px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          Gespeichert ✓
        </div>
      )}
    </div>
  );
}
