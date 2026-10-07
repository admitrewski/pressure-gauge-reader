# Deployed app: live API responses

_Captured 2026-10-07 15:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## GET /api/readings → HTTP 200

30 readings · lastReadAt 2026-10-06T12:49:26.216Z · reviewConfidenceThreshold 0.7

The corrected reading (`gauge_009.jpg`):

```json
{
 "image_id": "gauge_009.jpg",
 "gauge_id": "PI-3102",
 "site": "Northbay Refinery",
 "ai_value": 5,
 "final_value": 1,
 "unit": "bar",
 "vlm_confidence": 0.86,
 "reading_status": "normal",
 "review_status": "overridden",
 "override_reason": "Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end",
 "reviewed_at": "2026-10-06T13:28:01.398Z"
}
```

## GET /api/model-usage → HTTP 200

```json
[
 {
  "usage_date": "2026-10-06T00:00:00.000Z",
  "model_service": "system.ai.gpt-5-5",
  "model": "gpt-5-5",
  "requests": "33",
  "errors": "0",
  "images_read": "30",
  "input_tokens": "65063",
  "output_tokens": "31717",
  "reasoning_tokens": "29422",
  "cache_read_tokens": "1792",
  "avg_latency_ms": null,
  "est_input_cost_usd": 0.3173,
  "est_output_cost_usd": 0.9515,
  "est_cost_usd": 1.2688,
  "usd_per_dbu": "0.070000000000000000",
  "first_call_at": "2026-10-06T11:51:06.000Z",
  "last_call_at": "2026-10-06T12:51:06.000Z"
 }
]
```

## GET /api/review-stats → HTTP 200

```json
{
 "decisions": 1,
 "images_reviewed": 1,
 "last_decision_at": "2026-10-06T13:28:01.398Z"
}
```
