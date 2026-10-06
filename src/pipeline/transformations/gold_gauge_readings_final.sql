-- Gold: one row per gauge reading for the business (app via Lakebase, Genie Agent).
-- Joins the AI reading with gauge metadata and the latest human review decision. Review decisions
-- arrive from Lakebase through Lakehouse Sync (CDC history table) - DECISIONS D4, D6, D14, D15.
CREATE OR REFRESH MATERIALIZED VIEW gold_gauge_readings_final (
  CONSTRAINT has_metadata EXPECT (gauge_id IS NOT NULL)
)
COMMENT "Final gauge readings: AI reading + gauge metadata + latest human review; reading_status, needs_review and is_human_corrected are calculated here"
AS
WITH meta AS (
  SELECT * EXCEPT (rn) FROM (
    SELECT *, row_number() OVER (PARTITION BY image_file ORDER BY ingested_at DESC) AS rn FROM bronze_gauge_metadata
  ) WHERE rn = 1
),
review_rows AS (            -- current state of each review row from the CDC history (SCD2)
  SELECT * EXCEPT (rn) FROM (
    SELECT *, row_number() OVER (PARTITION BY override_id ORDER BY _pg_lsn DESC) AS rn
    FROM ${gauge.overrides_history_table}
    WHERE _pg_change_type IN ('insert', 'update_postimage', 'delete')
  ) WHERE rn = 1 AND _pg_change_type <> 'delete'
),
latest_review AS (          -- most recent decision per image
  SELECT * EXCEPT (rn) FROM (
    SELECT *, row_number() OVER (PARTITION BY image_id ORDER BY reviewed_at DESC, override_id DESC) AS rn FROM review_rows
  ) WHERE rn = 1
),
base AS (
  SELECT
    r.image_file AS image_id, r.image_path,
    m.gauge_id, m.site, m.unit_area, m.captured_at, m.robot_id,
    r.unit AS unit_label,
    CASE                                                     -- normalise the unit as printed on the dial
      WHEN r.unit IS NULL OR trim(r.unit) = '' THEN 'unknown'
      WHEN lower(r.unit) RLIKE 'kpa'          THEN 'kPa'
      WHEN lower(r.unit) RLIKE 'mpa|мпа'      THEN 'MPa'
      WHEN lower(r.unit) RLIKE 'mbar'         THEN 'mbar'
      WHEN lower(r.unit) RLIKE 'bar'          THEN 'bar'
      WHEN lower(r.unit) RLIKE 'psi|pound|lb' THEN 'psi'
      WHEN lower(r.unit) RLIKE 'kg'           THEN 'kg/cm2'
      WHEN lower(r.unit) RLIKE 'ws|h2o|wc'    THEN 'mmH2O'
      WHEN regexp_replace(lower(r.unit), '[^a-z]', '') = 'hpz' THEN 'hpz'
      ELSE r.unit
    END AS unit,
    r.scale_min, r.scale_max,
    r.reading_value AS ai_value, r.confidence AS vlm_confidence, r.readable AS vlm_readable,
    concat_ws(', ', r.issues) AS vlm_issues, r.notes AS vlm_notes, r.vlm_error,
    r.model_name, r.read_at,
    ROUND(COALESCE(m.normal_max_override, 0.75 * r.scale_max), 2) AS normal_max,
    lr.action AS review_action, lr.human_value, lr.override_reason, lr.reviewed_by, lr.reviewed_at
  FROM silver_gauge_readings r
  LEFT JOIN meta m           ON m.image_file = r.image_file
  LEFT JOIN latest_review lr ON lr.image_id  = r.image_file
),
scored AS (
  SELECT *,
    CASE review_action WHEN 'override' THEN human_value WHEN 'unreadable' THEN NULL ELSE ai_value END AS final_value,
    (NOT vlm_readable OR vlm_confidence < CAST('${gauge.review_threshold}' AS DOUBLE) OR ai_value > normal_max) AS ai_flagged
  FROM base
)
SELECT
  image_id, gauge_id, site, unit_area, captured_at, robot_id,
  final_value, unit, unit_label, scale_min, scale_max, normal_max,
  ROUND(final_value / NULLIF(scale_max, 0), 3) AS pct_of_scale,
  CASE WHEN final_value IS NULL THEN 'unreadable'
       WHEN final_value > normal_max THEN 'high'
       ELSE 'normal' END AS reading_status,
  CASE review_action WHEN 'override' THEN 'overridden' WHEN 'confirm' THEN 'confirmed' WHEN 'unreadable' THEN 'marked_unreadable'
       ELSE CASE WHEN ai_flagged THEN 'pending_review' ELSE 'auto_accepted' END END AS review_status,
  (review_action IS NULL AND ai_flagged) AS needs_review,
  COALESCE(review_action = 'override', false) AS is_human_corrected,
  ai_value, vlm_confidence, vlm_readable, vlm_issues, vlm_notes, vlm_error,
  human_value, override_reason, reviewed_by, reviewed_at,
  image_path, model_name, read_at
FROM scored;
