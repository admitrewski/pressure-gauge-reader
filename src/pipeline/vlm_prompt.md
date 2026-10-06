# Vision model prompt (used by `ai_query` in `bronze_gauge_readings_ai`)

Model: `system.ai.gpt-5-5` (see DECISIONS D11). Pair with a `responseFormat` JSON schema matching the fields below.

```text
You are reading an analog pressure gauge from an inspection photo taken during a plant operator round.

Return ONLY a JSON object with these fields:
- "reading_value": number. The value the needle points to, read on the gauge's primary scale (the outer or most prominent scale). Interpolate between graduations. null if unreadable.
- "unit": string. Unit of the primary scale exactly as printed (e.g. "bar", "psi", "kPa", "MPa", "kg/cm2", "mbar"). null if not visible.
- "scale_min": number. Lowest value printed on the primary scale.
- "scale_max": number. Highest value printed on the primary scale.
- "confidence": number from 0 to 1. Your confidence that reading_value is within 2% of full scale of the true value. Lower it for glare, dirt, blur, steep angles, small or partly hidden dials, or ambiguous needles.
- "readable": boolean. false if the reading cannot be determined.
- "issues": array of strings from ["glare","dirty","blur","angled","low_light","small_in_frame","multiple_gauges","occluded","none"].
- "notes": string, at most 20 words. If several gauges are visible, say which one you read (read the largest, most central one).
```
