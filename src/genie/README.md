# Genie Agent: inspection readings

Data source: `gold_gauge_readings_final` (single table).
Context, in order of preference: column descriptions and synonyms ("override", "manual correction", "intervention" → `is_human_corrected`; "unusually high", "excursion" → `reading_status = 'high'`; "pending review" → `needs_review`), example SQL, then minimal text instructions.

Example questions (shown as clickable chips in the app; about the data, not what the app already shows):
- Which locations have the highest number of low-confidence readings?
- Which image issues most often lead to low-confidence readings?
- Which inspection robot captures the most readings that need review?
- How does average AI confidence vary by process unit?
- Which gauges are running closest to their normal operating limit?

Benchmarks: needs review now, unreadable gauges, unexpectedly high readings per site, human overrides (`build_space.py`).
