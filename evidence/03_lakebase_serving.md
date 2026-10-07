# Lakebase serving tables: query results

_Captured 2026-10-07 15:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Counts in `pressure_gauge.gauge_readings_serving` (synced copy of gold)

| rows | needs_review | unexpectedly_high | human_corrected |
|---|---|---|---|
| 30 | 9 | 4 | 1 |

## Readings needing review first, lowest confidence first (as the review queue shows them)

| image_id | gauge_id | site | final_value | unit | confidence | reading_status | review_status |
|---|---|---|---|---|---|---|---|
| gauge_004.jpg | PI-1101 | Northbay Refinery |  | unknown | 0.00 | unreadable | pending_review |
| gauge_003.jpg | PI-6102 | Ridgeway Terminal | 190 | psi | 0.42 | normal | pending_review |
| gauge_006.jpg | PI-6103 | Ridgeway Terminal | 0.2 | kg/cm2 | 0.42 | normal | pending_review |
| gauge_027.jpg | PI-5102 | Ridgeway Terminal | 115 | unknown | 0.45 | normal | pending_review |
| gauge_002.jpg | PI-6101 | Ridgeway Terminal | 4.1 | psi | 0.58 | normal | pending_review |
| gauge_030.jpg | PI-4108 | Northbay Refinery | 620 | kPa | 0.62 | high | pending_review |
| gauge_016.jpg | PI-3104 | Northbay Refinery | 68 | psi | 0.78 | high | pending_review |
| gauge_013.jpg | PI-3103 | Northbay Refinery | 187 | psi | 0.86 | high | pending_review |
| gauge_001.jpg | PI-2101 | Northbay Refinery | 20 | bar | 0.88 | high | pending_review |
| gauge_010.jpg | PI-1102 | Northbay Refinery | 2.7 | bar | 0.72 | normal | auto_accepted |

## `pressure_gauge.vlm_usage_serving` (synced copy of gold_vlm_usage_daily)

| usage_date | model_service | requests | images_read | errors | input_tokens | output_tokens | est_cost_usd |
|---|---|---|---|---|---|---|---|
| 2026-10-06 | system.ai.gpt-5-5 | 33 | 30 | 0 | 65063 | 31717 | 1.2688 |
