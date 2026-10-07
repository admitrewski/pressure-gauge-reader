import { useCallback, useEffect, useState } from 'react';
import { toNumber } from '../review/types';

/** One day of vision-model usage (gold_vlm_usage_daily, synced to Lakebase). */
export interface UsageDay {
  usage_date: string;
  model_service: string;
  model: string | null;
  requests: number;
  errors: number;
  images_read: number | null;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cache_read_tokens: number;
  avg_latency_ms: number | null;
  est_input_cost_usd: number;
  est_output_cost_usd: number;
  est_cost_usd: number;
  usd_per_dbu: number | null;
  last_call_at: string | null;
}

export interface UsageTotals {
  requests: number;
  errors: number;
  images: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  inputCost: number;
  outputCost: number;
  cost: number;
  costPerImage: number | null;
  lastCallAt: string | null;
  modelService: string | null;
}

function normalise(raw: Record<string, unknown>): UsageDay {
  const n = (k: string) => toNumber(raw[k]) ?? 0;
  const s = (k: string) => (raw[k] === null || raw[k] === undefined ? null : String(raw[k] as string));
  return {
    usage_date: String(raw.usage_date as string).slice(0, 10),
    model_service: String(raw.model_service as string),
    model: s('model'),
    requests: n('requests'),
    errors: n('errors'),
    images_read: toNumber(raw.images_read),
    input_tokens: n('input_tokens'),
    output_tokens: n('output_tokens'),
    reasoning_tokens: n('reasoning_tokens'),
    cache_read_tokens: n('cache_read_tokens'),
    avg_latency_ms: toNumber(raw.avg_latency_ms),
    est_input_cost_usd: n('est_input_cost_usd'),
    est_output_cost_usd: n('est_output_cost_usd'),
    est_cost_usd: n('est_cost_usd'),
    usd_per_dbu: toNumber(raw.usd_per_dbu),
    last_call_at: s('last_call_at'),
  };
}

export function totalsOf(days: UsageDay[]): UsageTotals {
  const sum = (f: (d: UsageDay) => number) => days.reduce((acc, d) => acc + f(d), 0);
  const images = sum((d) => d.images_read ?? 0);
  const cost = sum((d) => d.est_cost_usd);
  return {
    requests: sum((d) => d.requests),
    errors: sum((d) => d.errors),
    images,
    inputTokens: sum((d) => d.input_tokens),
    outputTokens: sum((d) => d.output_tokens),
    reasoningTokens: sum((d) => d.reasoning_tokens),
    inputCost: sum((d) => d.est_input_cost_usd),
    outputCost: sum((d) => d.est_output_cost_usd),
    cost,
    costPerImage: images > 0 ? cost / images : null,
    lastCallAt:
      days
        .map((d) => d.last_call_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    modelService: days[0]?.model_service ?? null,
  };
}

export function useModelUsage() {
  const [days, setDays] = useState<UsageDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/model-usage');
      if (!res.ok) throw new Error(`Failed to load model usage (${res.status})`);
      const body = (await res.json()) as { days: Record<string, unknown>[] };
      setDays(body.days.map(normalise));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model usage');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { days, error, reload: load };
}

export function formatUsd(v: number | null, digits = 2): string {
  if (v === null) return '—';
  return `$${v.toFixed(digits)}`;
}

export function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}
