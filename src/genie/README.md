# Genie Agent: inspection readings

Data source: `gold_gauge_readings_final` (single table).
Context, in order of preference: column descriptions and synonyms ("override", "manual correction", "intervention" → `is_human_corrected`; "unusually high", "excursion" → `reading_status = 'high'`; "pending review" → `needs_review`), example SQL, then minimal text instructions.

Benchmark questions (draft):
- Which image readings needed human intervention?
- Are any pressure readings unusually high?
- Which site had the most high readings this week?
- What % of readings were corrected by a reviewer, by site?
- Which gauges have low vision-model confidence?
- How many readings are still waiting for review?
- Which dials could not be read, and why?
