# Unity Gateway: observability and control of the vision model

The pipeline calls the vision model through **Unity AI Gateway**: `ai_query('system.ai.gpt-5-5', …)` uses the model's Unity Catalog service name rather than a legacy serving endpoint (note: no `databricks-` prefix inside `ai_query`; verified in the build workspace). Every gauge reading the AI makes is then governed and observable in one place.

| Capability | What it gives the customer | Evidence (text) |
|---|---|---|
| **Access control** | Only the pipeline's principal can call the model; analysts and the app cannot | Grants on the model service → `evidence/07_gateway.md` |
| **Usage and cost tracking** | Tokens and cost per pipeline run, per day, per image | Usage system-table query for the pipeline's calls |
| **Rate limits** | One inspection round can't flood the model or exhaust shared capacity | Configured limit |
| **Budgets** | Spend cap for the gauge-reading workload | Budget policy configuration |
| **Request logging / tracing** | Every request and response kept for audit (image ID → model → reading) | Sample logged request/response |
| **Model choice** | Swap or fall back to another vision model without changing pipeline code | Configuration diff |

## Findings in the build workspace (2026-10-06)
- **Usage is captured:** `system.ai_gateway.usage` records every pipeline call to `system.ai.gpt-5-5` (`invocation_metadata.source = 'AI_QUERY'`, requester, tokens, latency, status). See `evidence/07_gateway.md`; the known batch-tracking issue (ES-2199366) did not affect this workspace.
- **Access is governed in UC:** `EXECUTE` on `system.ai` (held by `account users`) controls who can call the model service.
- **Per-workload limits:** a project-owned model service (`databricks ai-gateway create-model-service`) can be created, but batch `ai_query` returns 404 for it, so rate limits and budgets for this workload are a platform-team configuration (DECISIONS D20).
- **Batch support:** the newest models (GPT-6, Claude 5.x, Gemini 3.7+) return "not supported for batch inference" from `ai_query`.
