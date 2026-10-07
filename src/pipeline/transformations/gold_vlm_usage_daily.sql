-- Gold: daily usage and estimated cost of the vision model, from Unity AI Gateway (system.ai_gateway.usage).
-- Only this pipeline's batch calls are counted: the configured model service, called through ai_query, by the
-- pipeline's run-as identity. Cost = tokens x the model's published DBU rate per 1M tokens x the SKU's current
-- list price (system.billing.list_prices), so it is a list-price estimate, not an invoice - DECISIONS D21.
CREATE OR REFRESH MATERIALIZED VIEW gold_vlm_usage_daily
COMMENT "Daily vision-model usage (requests, tokens, errors, latency) and estimated list-price cost for the gauge pipeline, from Unity AI Gateway"
AS
WITH price AS (
  SELECT pricing.default AS usd_per_dbu FROM system.billing.list_prices
  WHERE sku_name = '${gauge.price_sku}' AND price_end_time IS NULL
),
calls AS (
  SELECT
    to_date(event_time) AS usage_date, endpoint_name, destination_model, event_time, status_code, latency_ms,
    input_tokens, output_tokens,
    COALESCE(token_details.cache_read_input_tokens, 0) AS cache_read_tokens,
    COALESCE(token_details.output_reasoning_tokens, 0) AS reasoning_tokens
  FROM system.ai_gateway.usage
  WHERE endpoint_name = '${gauge.vlm_model}'
    AND invocation_metadata.source = 'AI_QUERY'
    AND requester = current_user()
),
images AS (                 -- gauge images read per day (one model call per image in bronze)
  SELECT to_date(read_at) AS usage_date, count(*) AS images_read FROM bronze_gauge_readings_ai GROUP BY 1
)
SELECT
  c.usage_date,
  c.endpoint_name AS model_service,
  max(c.destination_model) AS model,
  count(*) AS requests,
  count_if(c.status_code <> 200) AS errors,
  max(i.images_read) AS images_read,
  sum(c.input_tokens) AS input_tokens,
  sum(c.output_tokens) AS output_tokens,
  sum(c.reasoning_tokens) AS reasoning_tokens,
  sum(c.cache_read_tokens) AS cache_read_tokens,
  ROUND(avg(c.latency_ms)) AS avg_latency_ms,
  ROUND(((sum(c.input_tokens) - sum(c.cache_read_tokens)) * CAST('${gauge.dbu_per_m_input}' AS DOUBLE)
         + sum(c.cache_read_tokens) * CAST('${gauge.dbu_per_m_cache_read}' AS DOUBLE)) / 1e6 * max(p.usd_per_dbu), 4) AS est_input_cost_usd,
  ROUND(sum(c.output_tokens) * CAST('${gauge.dbu_per_m_output}' AS DOUBLE) / 1e6 * max(p.usd_per_dbu), 4) AS est_output_cost_usd,
  ROUND(((sum(c.input_tokens) - sum(c.cache_read_tokens)) * CAST('${gauge.dbu_per_m_input}' AS DOUBLE)
         + sum(c.cache_read_tokens) * CAST('${gauge.dbu_per_m_cache_read}' AS DOUBLE)
         + sum(c.output_tokens) * CAST('${gauge.dbu_per_m_output}' AS DOUBLE)) / 1e6 * max(p.usd_per_dbu), 4) AS est_cost_usd,
  max(p.usd_per_dbu) AS usd_per_dbu,
  min(c.event_time) AS first_call_at,
  max(c.event_time) AS last_call_at
FROM calls c
CROSS JOIN price p
LEFT JOIN images i ON i.usage_date = c.usage_date
GROUP BY c.usage_date, c.endpoint_name;
