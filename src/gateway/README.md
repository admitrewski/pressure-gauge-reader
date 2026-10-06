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

## Check on day one (known issues as of Sep–Oct 2026)
- **Batch `ai_query` usage missing from Cost Analysis and budgets** (ES-2199366). A fix has been rolling out by region. Confirm the pipeline's usage shows up in the build workspace.
- **One field report of `PERMISSION_DENIED`** when calling `ai_query` with `system.ai.*` syntax in a Unity Gateway v3 workspace (not reproduced internally). Test a single call before building the pipeline around it.
- Verified 2026-10-06: `ai_query('system.ai.gpt-5-5', …)` succeeds from the serverless SQL warehouse. Still to confirm: the calls appear in Unity Gateway usage, and the exact privilege needed to call the service.
- Newest models (GPT-6, Claude 5.x, Gemini 3.7+) currently return "not supported for batch inference" from `ai_query`.
