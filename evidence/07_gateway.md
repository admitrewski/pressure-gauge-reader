# Unity AI Gateway: observability and control of the vision model

_Captured 2026-10-06 13:40 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Usage of `system.ai.gpt-5-5` by the pipeline (system.ai_gateway.usage)

| hour_utc | endpoint_name | source | requests | input_tokens | output_tokens | errors | avg_latency_s |
|---|---|---|---|---|---|---|---|
| 2026-10-06T11:00:00.000Z | system.ai.gpt-5-5 | AI_QUERY | 1 | 12 | 17 | 0 |  |
| 2026-10-06T12:00:00.000Z | system.ai.gpt-5-5 | AI_QUERY | 32 | 65051 | 31700 | 0 |  |

## Control

- Access: `EXECUTE` on `system.ai` (UC) governs who can call the model service.
- The pipeline calls the model by its UC service name, so every gauge reading is attributable (requester, tokens, latency, status).
- Finding: batch `ai_query` accepts `system.ai.*` services but not a project-owned model service (404), so per-workload rate limits would be configured on the platform side.
