export type ReadingStatus = 'normal' | 'high' | 'unreadable';
export type ReviewStatus = 'auto_accepted' | 'pending_review' | 'confirmed' | 'overridden' | 'marked_unreadable';
export type ReviewAction = 'confirm' | 'override' | 'unreadable';

export interface Reading {
  image_id: string;
  gauge_id: string | null;
  site: string | null;
  unit_area: string | null;
  captured_at: string | null;
  robot_id: string | null;
  unit: string | null;
  unit_label: string | null;
  scale_min: number | null;
  scale_max: number | null;
  normal_max: number | null;
  ai_value: number | null;
  final_value: number | null;
  vlm_confidence: number | null;
  vlm_readable: boolean | null;
  vlm_issues: string | null;
  vlm_notes: string | null;
  model_name: string | null;
  read_at: string | null;
  reading_status: ReadingStatus;
  review_status: ReviewStatus;
  needs_review: boolean;
  is_human_corrected: boolean;
  human_value: number | null;
  override_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ReadingsResponse {
  readings: Record<string, unknown>[];
  lastReadAt: string | null;
  reviewConfidenceThreshold: number;
}

/** pg returns NUMERIC/DOUBLE as strings in some drivers; normalise to numbers. */
export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normaliseReading(raw: Record<string, unknown>): Reading {
  const num = (k: string) => toNumber(raw[k]);
  const str = (k: string): string | null => {
    const v = raw[k];
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v instanceof Date) return v.toISOString();
    return JSON.stringify(v);
  };
  return {
    image_id: String(raw.image_id),
    gauge_id: str('gauge_id'),
    site: str('site'),
    unit_area: str('unit_area'),
    captured_at: str('captured_at'),
    robot_id: str('robot_id'),
    unit: str('unit'),
    unit_label: str('unit_label'),
    scale_min: num('scale_min'),
    scale_max: num('scale_max'),
    normal_max: num('normal_max'),
    ai_value: num('ai_value'),
    final_value: num('final_value'),
    vlm_confidence: num('vlm_confidence'),
    vlm_readable: raw.vlm_readable === null ? null : Boolean(raw.vlm_readable),
    vlm_issues: str('vlm_issues'),
    vlm_notes: str('vlm_notes'),
    model_name: str('model_name'),
    read_at: str('read_at'),
    reading_status: (str('reading_status') ?? 'normal') as ReadingStatus,
    review_status: (str('review_status') ?? 'auto_accepted') as ReviewStatus,
    needs_review: Boolean(raw.needs_review),
    is_human_corrected: Boolean(raw.is_human_corrected),
    human_value: num('human_value'),
    override_reason: str('override_reason'),
    reviewed_by: str('reviewed_by'),
    reviewed_at: str('reviewed_at'),
  };
}

export function formatValue(v: number | null, unit: string | null): string {
  if (v === null) return '—';
  const rounded = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
  return unit && unit !== 'unknown' ? `${rounded} ${unit}` : rounded;
}

export function formatDateTime(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
