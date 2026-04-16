// ─── Creator Engine — Shared Types & Constants ─────────────────────────────
// Used by all creator sub-components. Keep white-label: no hardcoded names.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  name: string;
  instagram_url: string;
  email: string | null;
  brand: string;
  status: string;
  follower_range: string | null;
  notes: string | null;
  created_at: string;
  tier?: string;
  affiliate_code?: string;
  affiliate_pct?: number;
  total_sales?: number;
  total_revenue?: number;
  content_count?: number;
  last_content_date?: string;
  assigned_operator?: string;
  onboarding_status?: string;
  brand_slug?: string;
  brand_fit_score?: number;
  // Tier realignment fields
  compensation_model?: string;
  retainer_eur?: number;
  flat_fee_eur?: number;
  payment_method?: string;
  payment_email?: string;
  churned_at?: string;
  pause_reason?: string;
}

export interface CreatorTask {
  id: string;
  creator_id: string;
  brand_slug: string;
  week_number: number;
  year: number;
  content_direction: string;
  angle_code: string | null;
  deadline: string | null;
  status: string;
  submission_url: string | null;
  feedback: string | null;
  feedback_given_at: string | null;
  quality_rating: number | null;
  repost_worthy: boolean;
  creator_name?: string;
  // Rejection fields
  rejection_reason?: string;
  resubmission_deadline?: string;
  original_task_id?: string;
}

export interface CreatorScoreboard {
  id: string;
  name: string;
  brand_slug: string;
  tier: string;
  total_sales: number;
  total_revenue: number;
  content_count: number;
  avg_delivery_rate_4w: number;
  top_videos_4w: number;
  sales_4w: number;
  creator_grade: string;
  rank: number;
  compensation_model?: string;
  retainer_eur?: number;
  flat_fee_eur?: number;
}

export interface OperatorDashboard {
  assigned_operator: string;
  operator_name: string;
  total_creators: number;
  active_creators: number;
  ambassadors: number;
  total_sales: number;
  total_revenue: number;
  open_tasks_this_week: number;
  delivered_this_week: number;
  delivery_rate_this_week: number;
}

export interface WeeklyPulse {
  brand_slug: string;
  brand_name: string;
  tasks_total: number;
  tasks_delivered: number;
  tasks_pending: number;
  tasks_overdue: number;
  delivery_rate: number;
  repost_worthy: number;
  avg_quality: number | null;
  tier_upgrades_this_week: number;
  top_5_names: string[] | null;
  top_5_grades: string[] | null;
}

export interface CreatorProspect {
  id: string;
  instagram_handle: string;
  instagram_url: string | null;
  display_name: string | null;
  follower_count: number | null;
  bio_text: string | null;
  source: string;
  source_hashtag: string | null;
  suggested_brand: string | null;
  niche_match: boolean;
  public_profile: boolean;
  qualification_score: number;
  status: string;
  converted_creator_id: string | null;
  discovered_at: string;
  qualified_at: string | null;
  notes: string | null;
}

export interface CreatorCommission {
  period_start: string;
  period_end: string;
  brand_slug: string;
  brand_name: string;
  creator_id: string;
  creator_name: string;
  tier: string;
  compensation_model: string;
  order_count: number;
  gross_revenue: number;
  commission_amount: number;
  flat_fee_total: number | null;
  retainer_amount: number | null;
  performance_bonus: number;
  total_cost: number;
  total_cac_pct: number | null;
  status: string;
  approved_by: string | null;
  payout_id: string | null;
  payout_status: string | null;
  payout_method: string | null;
  payout_date: string | null;
}

export interface GiftingEntry {
  id: string;
  name: string;
  tier: string;
  brand_slug: string;
  gift_type: string;
  gift_description: string | null;
  season: string | null;
  year: number | null;
  shipped_date: string | null;
  content_received: boolean;
  cost_eur: number | null;
  gift_status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const BRANDS = ['All', 'Paigh', 'Take A Shot', 'Wristr', 'Thiocyn', 'Dr. Severin', 'Timber & John'];

export const BRAND_SLUGS: Record<string, string> = {
  'Thiocyn': 'thiocyn', 'Take A Shot': 'take-a-shot', 'Paigh': 'paigh',
  'Dr. Severin': 'dr-severin', 'Wristr': 'wristr', 'Timber & John': 'timber-john',
};

export const STATUSES = ['Prospect', 'Contacted', 'Interested', 'Product sent', 'Content posted', 'Active'];

export const STATUS_COLORS: Record<string, string> = {
  Prospect: 'bg-slate-50 text-slate-700 border border-slate-200',
  Contacted: 'bg-blue-50 text-blue-700 border border-blue-200',
  Interested: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Product sent': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Content posted': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Active: 'bg-violet-50 text-violet-700 border border-violet-200',
};

export const NEXT_STATUS: Record<string, string> = {
  Prospect: 'Contacted', Contacted: 'Interested', Interested: 'Product sent',
  'Product sent': 'Content posted', 'Content posted': 'Active', Active: 'Active',
};

export const TIER_COLORS: Record<string, string> = {
  gifting: 'bg-slate-50 text-slate-700 border border-slate-200',
  affiliate: 'bg-blue-50 text-blue-700 border border-blue-200',
  influencer: 'bg-amber-50 text-amber-700 border border-amber-200',
  ambassador: 'bg-violet-50 text-violet-700 border border-violet-200',
};

export const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-50 text-green-700 border border-green-200',
  B: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  C: 'bg-red-50 text-red-700 border border-red-200',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  acknowledged: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  submitted: 'bg-amber-50 text-amber-700 border border-amber-200',
  feedback_given: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  skipped: 'bg-slate-50 text-slate-700 border border-slate-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  resubmitted: 'bg-purple-50 text-purple-700 border border-purple-200',
};

export const DIRECTION_LABELS: Record<string, string> = {
  problem_solution: 'Problem → Solution',
  storytelling: 'Storytelling',
  aesthetic: 'Aesthetic / Routine',
  myth_buster: 'Myth Buster',
};

export const getBrandSlug = (brand: string): string =>
  BRAND_SLUGS[brand] ?? brand.toLowerCase().replace(/\s+/g, '-');
