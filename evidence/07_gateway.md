# Unity AI Gateway: observability and control of the vision model

_Captured 2026-10-07 15:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Usage of `system.ai.gpt-5-5` by the pipeline (system.ai_gateway.usage)

| hour_utc | endpoint_name | source | requests | input_tokens | output_tokens | errors | avg_latency_s |
|---|---|---|---|---|---|---|---|
| 2026-10-06T11:00:00.000Z | system.ai.gpt-5-5 | AI_QUERY | 1 | 12 | 17 | 0 |  |
| 2026-10-06T12:00:00.000Z | system.ai.gpt-5-5 | AI_QUERY | 32 | 65051 | 31700 | 0 |  |

## Daily usage and list-price cost estimate (gold_vlm_usage_daily, shown on the app's *AI model & usage* page)

| usage_date | model_service | requests | images_read | errors | input_tokens | output_tokens | reasoning_tokens | est_input_cost_usd | est_output_cost_usd | est_cost_usd | est_cost_per_image_usd | usd_per_dbu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-06 | system.ai.gpt-5-5 | 33 | 30 | 0 | 65063 | 31717 | 29422 | 0.3173 | 0.9515 | 1.2688 | 0.0423 | 0.070000000000000000 |

## How the cost is estimated

Tokens from Unity AI Gateway × published GPT-5.5 pay-per-token rates (71.429 DBU per 1M input, 7.143 per 1M cached input, 428.571 per 1M output tokens) × the SKU's current list price from `system.billing.list_prices`. Requests can exceed images read when test calls were made (DECISIONS D21).

## Control

- Access: `EXECUTE` on `system.ai` (UC) governs who can call the model service.
- The pipeline calls the model by its UC service name, so every gauge reading is attributable (requester, tokens, latency, status).
- Finding: batch `ai_query` accepts `system.ai.*` services but not a project-owned model service (404), so per-workload rate limits would be configured on the platform side.
