-- Silver: the vision model's JSON response parsed into typed columns (DECISIONS D10).
CREATE OR REFRESH STREAMING TABLE silver_gauge_readings (
  CONSTRAINT vlm_call_succeeded  EXPECT (vlm_error IS NULL),
  CONSTRAINT response_parsed     EXPECT (vlm_error IS NOT NULL OR readable IS NOT NULL),
  CONSTRAINT reading_within_scale EXPECT (reading_value IS NULL OR reading_value BETWEEN scale_min AND scale_max),
  CONSTRAINT unit_present        EXPECT (readable IS NOT TRUE OR unit IS NOT NULL)
)
COMMENT "Parsed vision-model reading per image: value, unit, scale, confidence, readability and issues"
AS
SELECT
  image_file, image_path, model_name, read_at,
  vlm.errorMessage AS vlm_error,
  vlm.result       AS vlm_response_raw,
  p.reading_value, p.unit, p.scale_min, p.scale_max, p.confidence,
  COALESCE(p.readable, false) AND p.reading_value IS NOT NULL AS readable,
  p.issues, p.notes
FROM (
  SELECT *, from_json(vlm.result,
    'reading_value DOUBLE, unit STRING, scale_min DOUBLE, scale_max DOUBLE, confidence DOUBLE, readable BOOLEAN, issues ARRAY<STRING>, notes STRING') AS p
  FROM STREAM(bronze_gauge_readings_ai)
);
