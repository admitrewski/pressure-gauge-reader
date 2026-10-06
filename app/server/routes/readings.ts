import { z } from 'zod';
import type { Application, Request } from 'express';

interface AppKitWithLakebase {
  lakebase: {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

// Synced (read-only) copy of gold_gauge_readings_final, plus the app-owned review table.
// The live latest review is merged in so reviewers see their decision immediately; the gold table
// catches up on the next pipeline run (Lakehouse Sync -> Delta -> gold -> snapshot sync).
const SERVING_TABLE = 'pressure_gauge.gauge_readings_serving';
const REVIEW_TABLE = 'review.reading_overrides';
const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

const READINGS_SQL = `
  WITH live AS (
    SELECT DISTINCT ON (image_id)
      image_id, action, human_value, override_reason, reviewed_by, reviewed_at
    FROM ${REVIEW_TABLE}
    ORDER BY image_id, reviewed_at DESC, override_id DESC
  ),
  merged AS (
    SELECT
      g.image_id, g.gauge_id, g.site, g.unit_area, g.captured_at, g.robot_id,
      g.unit, g.unit_label, g.scale_min, g.scale_max, g.normal_max,
      g.ai_value, g.vlm_confidence, g.vlm_readable, g.vlm_issues, g.vlm_notes, g.model_name, g.read_at,
      CASE
        WHEN l.action = 'override'   THEN l.human_value
        WHEN l.action = 'unreadable' THEN NULL
        WHEN l.action = 'confirm'    THEN g.ai_value
        ELSE g.final_value
      END AS final_value,
      CASE l.action
        WHEN 'override'   THEN 'overridden'
        WHEN 'confirm'    THEN 'confirmed'
        WHEN 'unreadable' THEN 'marked_unreadable'
        ELSE g.review_status
      END AS review_status,
      COALESCE(l.human_value, g.human_value)         AS human_value,
      COALESCE(l.override_reason, g.override_reason) AS override_reason,
      COALESCE(l.reviewed_by, g.reviewed_by)         AS reviewed_by,
      COALESCE(l.reviewed_at, g.reviewed_at)         AS reviewed_at
    FROM ${SERVING_TABLE} g
    LEFT JOIN live l ON l.image_id = g.image_id
  )
  SELECT *,
    CASE WHEN final_value IS NULL THEN 'unreadable'
         WHEN final_value > normal_max THEN 'high'
         ELSE 'normal' END AS reading_status,
    review_status = 'pending_review' AS needs_review,
    review_status = 'overridden'     AS is_human_corrected
  FROM merged
  ORDER BY (review_status = 'pending_review') DESC, vlm_confidence ASC NULLS FIRST, image_id
`;

const ReviewBody = z
  .object({
    action: z.enum(['confirm', 'override', 'unreadable']),
    humanValue: z.number().finite().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.action !== 'override' || b.humanValue !== undefined, {
    message: 'An override needs a corrected value',
  });

function reviewerOf(req: Request): string {
  return req.header('x-forwarded-email') ?? req.header('x-forwarded-user') ?? 'local-developer';
}

export function setupReadingRoutes(appkit: AppKitWithLakebase) {
  appkit.server.extend((app) => {
    app.get('/api/whoami', (req, res) => {
      res.json({
        email: req.header('x-forwarded-email') ?? null,
        user: req.header('x-forwarded-user') ?? null,
      });
    });

    app.get('/api/readings', async (_req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(READINGS_SQL);
        const freshness = await appkit.lakebase.query(`SELECT max(read_at) AS last_read_at FROM ${SERVING_TABLE}`);
        res.json({
          readings: rows,
          lastReadAt: freshness.rows[0]?.last_read_at ?? null,
          reviewConfidenceThreshold: REVIEW_CONFIDENCE_THRESHOLD,
        });
      } catch (err) {
        console.error('Failed to load readings:', err);
        res.status(500).json({ error: 'Failed to load readings' });
      }
    });

    app.post('/api/readings/:imageId/review', async (req, res) => {
      const parsed = ReviewBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid review' });
        return;
      }
      const { action, humanValue, reason } = parsed.data;
      try {
        const exists = await appkit.lakebase.query(`SELECT 1 FROM ${SERVING_TABLE} WHERE image_id = $1`, [
          req.params.imageId,
        ]);
        if (exists.rows.length === 0) {
          res.status(404).json({ error: 'Unknown reading' });
          return;
        }
        const { rows } = await appkit.lakebase.query(
          `INSERT INTO ${REVIEW_TABLE} (image_id, action, human_value, override_reason, reviewed_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING override_id, reviewed_at`,
          [req.params.imageId, action, action === 'override' ? humanValue : null, reason || null, reviewerOf(req)]
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        console.error('Failed to save review:', err);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });
  });
}
