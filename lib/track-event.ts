/**
 * track-event — OS Metrics Helper
 *
 * Append-only event logger for the `os_metrics` table.
 * Two layers per docs/foundation/06-measurement.md §0:
 *   1. Operational (per feature)  → trackOperationalMetric()
 *   2. Outcome    (per role)      → trackOutcomeMetric()
 *
 * Failure mode: silent. Never break the user flow if logging fails.
 * Errors are surfaced via console.error so Sentry / dev tools can pick them up.
 *
 * Schema reference (8 columns, append-only, no updates/deletes):
 *   metric_layer | metric_name | module | role | value | unit | item_ref | notes
 *
 * Distinction from `lib/analytics.ts`:
 *   - analytics.ts → public form funnel events (anonymous, form_events table)
 *   - track-event.ts → internal operator metrics (authenticated, os_metrics table)
 */

import { supabase } from './supabaseClient';

export type MetricModule =
  | 'hiring'
  | 'academy'
  | 'finance'
  | 'cs'
  | 'marketing'
  | 'creator'
  | 'ecommerce'
  | 'brand'
  | 'iso'
  | 'system'
  | 'lead_capture'
  | 'video'
  | 'knowledge';

export type MetricRole =
  | 'luis'
  | 'tom'
  | 'mainak'
  | 'sameer'
  | 'vanessa'
  | 'peter'
  | 'valentin'
  | 'os';

export interface TrackOperationalOptions {
  value?: number;
  unit?: string;
  itemRef?: string;
  notes?: string;
}

export interface TrackOutcomeOptions {
  unit?: string;
  itemRef?: string;
  notes?: string;
}

/**
 * Log an operational metric (per feature, auto-emitted from UI events).
 *
 * Example:
 *   useEffect(() => {
 *     void trackOperationalMetric('application_list_view_opened', 'hiring');
 *   }, []);
 */
export async function trackOperationalMetric(
  metricName: string,
  module: MetricModule,
  options: TrackOperationalOptions = {}
): Promise<void> {
  const { value = 1, unit = 'count', itemRef, notes } = options;

  try {
    const { error } = await supabase.from('os_metrics').insert({
      metric_layer: 'operational',
      metric_name: metricName,
      module,
      role: null,
      value,
      unit,
      item_ref: itemRef ?? null,
      notes: notes ? `auto:${notes}` : 'auto',
    });

    if (error) {
      console.error('[track-event] operational insert failed:', error.message);
    }
  } catch (err) {
    console.error('[track-event] operational threw:', err);
  }
}

/**
 * Log an outcome metric (per role, manually captured during reviews / Sunday snapshots).
 *
 * Example:
 *   await trackOutcomeMetric(
 *     'luis_hours_per_week_on_hiring_admin',
 *     'hiring',
 *     'luis',
 *     3,
 *     { unit: 'hours', itemRef: 'welle_1_item_5', notes: 'baseline before send-button' }
 *   );
 */
export async function trackOutcomeMetric(
  metricName: string,
  module: MetricModule,
  role: MetricRole,
  value: number,
  options: TrackOutcomeOptions = {}
): Promise<void> {
  const { unit, itemRef, notes } = options;

  try {
    const { error } = await supabase.from('os_metrics').insert({
      metric_layer: 'outcome',
      metric_name: metricName,
      module,
      role,
      value,
      unit: unit ?? null,
      item_ref: itemRef ?? null,
      notes: notes ?? 'manual',
    });

    if (error) {
      console.error('[track-event] outcome insert failed:', error.message);
    }
  } catch (err) {
    console.error('[track-event] outcome threw:', err);
  }
}
