import type { Application } from 'express';

interface AppKitWithLakebase {
  lakebase: {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

// Synced (read-only) copy of gold_vlm_usage_daily: the vision model's calls, tokens and list-price cost,
// aggregated per day from Unity AI Gateway (system.ai_gateway.usage) by the pipeline.
const USAGE_TABLE = 'pressure_gauge.vlm_usage_serving';

const USAGE_SQL = `
  SELECT usage_date, model_service, model, requests, errors, images_read,
         input_tokens, output_tokens, reasoning_tokens, cache_read_tokens,
         avg_latency_ms, est_input_cost_usd, est_output_cost_usd, est_cost_usd, usd_per_dbu, first_call_at, last_call_at
  FROM ${USAGE_TABLE}
  ORDER BY usage_date DESC
`;

export function setupModelUsageRoutes(appkit: AppKitWithLakebase) {
  appkit.server.extend((app) => {
    app.get('/api/model-usage', async (_req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(USAGE_SQL);
        res.json({ days: rows });
      } catch (err) {
        console.error('Failed to load model usage:', err);
        res.status(500).json({ error: 'Failed to load model usage' });
      }
    });
  });
}
