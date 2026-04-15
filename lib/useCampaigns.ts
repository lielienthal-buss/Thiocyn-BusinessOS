import { useSupabaseQuery, supabaseInsert, supabaseUpdate } from './useSupabaseQuery';
import { supabase } from './supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'draft'
  | 'brief_review'
  | 'approved'
  | 'live'
  | 'paused'
  | 'completed'
  | 'killed';

export type CampaignPlatform = 'meta' | 'google' | 'tiktok' | 'cross';

export type CreativeSetStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'live'
  | 'paused';

export type AssetType = 'video' | 'image' | 'copy' | 'landing_page';

export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  objective: string | null;
  platform: CampaignPlatform | string;
  status: CampaignStatus;
  budget_planned: number | null;
  budget_spent: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agency {
  id: string;
  name: string;
  contact_email: string | null;
  allowed_brands: string[] | null;
  active: boolean;
  created_at: string;
}

export interface CampaignBrief {
  id: string;
  campaign_id: string;
  objective: string | null;
  target_audience: string | null;
  insight: string | null;
  key_message: string | null;
  angle: string | null;
  offer: string | null;
  kpi_target: Record<string, any> | null;
  budget: number | null;
  timeline_start: string | null;
  timeline_end: string | null;
  creative_requirements: Record<string, any> | null;
  mandatories: string | null;
  dos_and_donts: string | null;
  reference_links: string[] | null;
  notes: string | null;
  version: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreativeSet {
  id: string;
  campaign_id: string;
  name: string;
  status: CreativeSetStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface CampaignAsset {
  id: string;
  creative_set_id: string;
  type: AssetType | null;
  url: string;
  label: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface CampaignComment {
  id: string;
  campaign_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  parent_id: string | null;
  created_at: string;
}

export interface CampaignKPI {
  id: string;
  campaign_id: string;
  snapshot_date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
  source: string;
  created_at: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export interface CampaignFilters {
  brand_id?: string | null;
  status?: CampaignStatus | null;
  agency_id?: string | null;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCampaigns(filters: CampaignFilters = {}) {
  const { brand_id, status, agency_id } = filters;
  return useSupabaseQuery<Campaign>({
    table: 'campaigns',
    orderBy: { column: 'updated_at', ascending: false },
    filter: (q) => {
      let out = q;
      if (brand_id) out = out.eq('brand_id', brand_id);
      if (status) out = out.eq('status', status);
      if (agency_id) out = out.eq('agency_id', agency_id);
      return out;
    },
    deps: [brand_id ?? '', status ?? '', agency_id ?? ''],
  });
}

export function useAgencies() {
  return useSupabaseQuery<Agency>({
    table: 'agencies',
    orderBy: { column: 'name', ascending: true },
    filter: (q) => q.eq('active', true),
  });
}

export function useCampaign(id: string | null) {
  return useSupabaseQuery<Campaign & {
    campaign_briefs: CampaignBrief[];
    campaign_creative_sets: CampaignCreativeSet[];
    campaign_comments: { count: number }[];
  }>({
    table: 'campaigns',
    select: '*, campaign_briefs(*), campaign_creative_sets(*), campaign_comments(count)',
    filter: (q) => q.eq('id', id ?? ''),
    enabled: !!id,
    deps: [id ?? ''],
  });
}

export function useCampaignBrief(campaignId: string | null) {
  return useSupabaseQuery<CampaignBrief>({
    table: 'campaign_briefs',
    filter: (q) => q.eq('campaign_id', campaignId ?? ''),
    orderBy: { column: 'version', ascending: false },
    enabled: !!campaignId,
    deps: [campaignId ?? ''],
  });
}

export function useCampaignComments(campaignId: string | null) {
  return useSupabaseQuery<CampaignComment>({
    table: 'campaign_comments',
    filter: (q) => q.eq('campaign_id', campaignId ?? ''),
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!campaignId,
    deps: [campaignId ?? ''],
  });
}

export function useCampaignKPIs(campaignId: string | null) {
  return useSupabaseQuery<CampaignKPI>({
    table: 'campaign_kpis',
    filter: (q) => q.eq('campaign_id', campaignId ?? ''),
    orderBy: { column: 'snapshot_date', ascending: false },
    enabled: !!campaignId,
    deps: [campaignId ?? ''],
  });
}

export function useCreativeSets(campaignId: string | null) {
  return useSupabaseQuery<CampaignCreativeSet>({
    table: 'campaign_creative_sets',
    filter: (q) => q.eq('campaign_id', campaignId ?? ''),
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!campaignId,
    deps: [campaignId ?? ''],
  });
}

export function useCreativeSetAssets(campaignId: string | null) {
  // Fetch all assets for sets in this campaign via join.
  return useSupabaseQuery<CampaignAsset & { campaign_creative_sets: { campaign_id: string } }>({
    table: 'campaign_assets',
    select: '*, campaign_creative_sets!inner(campaign_id)',
    filter: (q) => q.eq('campaign_creative_sets.campaign_id', campaignId ?? ''),
    orderBy: { column: 'uploaded_at', ascending: false },
    enabled: !!campaignId,
    deps: [campaignId ?? ''],
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createCampaign(values: {
  brand_id: string;
  name: string;
  platform: string;
  objective?: string | null;
  status?: CampaignStatus;
  budget_planned?: number | null;
  agency_id?: string | null;
}) {
  return supabaseInsert<Campaign>('campaigns', {
    status: 'draft',
    ...values,
  });
}

export async function updateCampaign(id: string, values: Partial<Campaign>) {
  return supabaseUpdate<Campaign>('campaigns', id, values);
}

export async function upsertBrief(
  campaignId: string,
  values: Partial<CampaignBrief>,
  existingId?: string,
) {
  if (existingId) {
    return supabaseUpdate<CampaignBrief>('campaign_briefs', existingId, values);
  }
  return supabaseInsert<CampaignBrief>('campaign_briefs', {
    campaign_id: campaignId,
    ...values,
  });
}

export async function approveBrief(briefId: string, campaignId: string, approverId: string | null) {
  const now = new Date().toISOString();
  const { error: briefErr } = await supabase
    .from('campaign_briefs')
    .update({ approved_at: now, approved_by: approverId })
    .eq('id', briefId);
  if (briefErr) return { error: briefErr.message };

  const { error: campErr } = await supabase
    .from('campaigns')
    .update({ status: 'approved' })
    .eq('id', campaignId);
  return { error: campErr?.message ?? null };
}

export async function addComment(values: {
  campaign_id: string;
  body: string;
  author_id?: string | null;
  author_name?: string | null;
  parent_id?: string | null;
}) {
  return supabaseInsert<CampaignComment>('campaign_comments', values);
}

export async function addKPISnapshot(values: {
  campaign_id: string;
  snapshot_date: string;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  source?: string;
}) {
  const { data, error } = await supabase
    .from('campaign_kpis')
    .upsert(
      { source: 'manual', ...values },
      { onConflict: 'campaign_id,snapshot_date' },
    )
    .select()
    .single();
  return { data: data as CampaignKPI | null, error: error?.message ?? null };
}

export async function createCreativeSet(values: {
  campaign_id: string;
  name: string;
  status?: CreativeSetStatus;
}) {
  return supabaseInsert<CampaignCreativeSet>('campaign_creative_sets', {
    status: 'draft',
    ...values,
  });
}

export async function addAsset(values: {
  creative_set_id: string;
  type: AssetType;
  url: string;
  label?: string | null;
  uploaded_by?: string | null;
}) {
  return supabaseInsert<CampaignAsset>('campaign_assets', values);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'draft',
  'brief_review',
  'approved',
  'live',
  'paused',
  'completed',
];

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  brief_review: 'Brief Review',
  approved: 'Approved',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  killed: 'Killed',
};

// Harmonized analogous palette — cool (draft/review/approved) → active green →
// warm (paused) → conclusion (sky/rose). Consistent `bg-{c}-500/15 text-{c}-600 border-{c}-500/20`.
export const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: 'bg-slate-400/15 text-slate-500 border-slate-400/20',
  brief_review: 'bg-violet-500/15 text-violet-600 border-violet-500/20',
  approved: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/20',
  live: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  paused: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  completed: 'bg-sky-500/15 text-sky-600 border-sky-500/20',
  killed: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
};
