# Lakeflow Spark Declarative Pipeline (SQL, serverless, triggered)

| Dataset | Type | Purpose |
|---|---|---|
| `bronze_gauge_readings_ai` | Streaming table | Auto Loader (`binaryFile`, `*.jpg`/`*.png`) → `ai_query` vision model via Unity Gateway (`system.ai.gpt-5-5`, prompt in `vlm_prompt.md`), with `responseFormat` and `failOnError => false`, called **once per image**. Keeps the path, not the bytes |
| `quarantine_vlm_errors` | Streaming table | Rows where `ai_query` returned `errorMessage` |
| `bronze_gauge_metadata` | Streaming table | Auto Loader CSV with `schemaHints` |
| `gold_gauge_readings_final` | Materialized view | Metadata + AI reading + latest human override → `final_value`, `reading_status`, `needs_review`, `is_human_corrected`. CDF on (source of the Lakebase synced table) |

## Vision model output (`responseFormat`, flattened to columns)
| Field | Type | Meaning |
|---|---|---|
| `reading_value` | DOUBLE | Needle reading, in the dial's primary unit |
| `unit` | STRING | e.g. `bar`, `psi`, `kg/cm2`, `MPa`, `mbar` |
| `scale_min`, `scale_max` | DOUBLE | Printed range of the dial |
| `confidence` | DOUBLE (0–1) | Model's confidence in the reading |
| `readable` | BOOLEAN | False if the dial can't be read (dirt, glare, occlusion) |
| `issues` | ARRAY<STRING> | e.g. `glare`, `dirty`, `angled`, `multiple_gauges`, `low_light` |

Flatten to plain columns before the synced table: VARIANT isn't supported, and STRUCT/ARRAY arrive as JSONB.

## Derived in gold
- `pct_of_scale = reading_value / scale_max`
- `normal_max = COALESCE(metadata.normal_max_override, 0.75 * scale_max)`; see DECISIONS D14
- `reading_status`: `unreadable` | `high` (above `normal_max`) | `normal`
- `needs_review`: confidence below threshold, OR not readable, OR `high` (D15)
- `final_value = COALESCE(human_value, reading_value)`; `is_human_corrected = human_value IS NOT NULL`

Expectations: every image has metadata; VLM response parsed; `reading_value` between `scale_min` and `scale_max`; unit present.

`gold_gauge_readings_final` columns (draft): `image_id, image_path, gauge_id, site, unit_area, captured_at, robot_id, unit, scale_min, scale_max, reading_value, confidence, readable, issues, pct_of_scale, normal_max, reading_status, needs_review, human_value, override_reason, reviewed_at, final_value, is_human_corrected, model_name`.
