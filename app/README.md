# Databricks App: gauge review
- Review queue, low confidence first: image (from the volume via the Files API), metadata, AI reading, status
- Confirm or override the reading, with a reason code → `review.reading_overrides` in Lakebase
- Excursion flag when a reading is above `normal_max`
- Embedded Genie Agent (on-behalf-of the signed-in user)

Framework: open (DECISIONS D9).
