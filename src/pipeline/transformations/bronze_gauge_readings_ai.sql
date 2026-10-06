-- Bronze: one row per gauge image. Auto Loader picks up each new image exactly once and the vision
-- model is called through Unity AI Gateway (system.ai.*) inside the streaming table, so an image is
-- never re-read on refresh (DECISIONS D2). The image bytes are not stored, only the path.
CREATE OR REFRESH STREAMING TABLE bronze_gauge_readings_ai
COMMENT "Vision-model reading for each gauge image (raw structured response + error), one row per image"
AS
SELECT
  regexp_extract(path, '([^/]+)$', 1)  AS image_file,
  path                                AS image_path,
  modificationTime                    AS file_modified_at,
  length                              AS file_size_bytes,
  '${gauge.vlm_model}'                AS model_name,
  current_timestamp()                 AS read_at,
  ai_query(
    '${gauge.vlm_model}',
    'You are reading an analog pressure gauge from an inspection photo taken during a plant operator round.

Return ONLY a JSON object with these fields:
- "reading_value": number. The value the needle points to, read on the gauge''s primary scale (the outer or most prominent scale). Interpolate between graduations. null if unreadable.
- "unit": string. Unit of the primary scale exactly as printed (e.g. "bar", "psi", "kPa", "MPa", "kg/cm2", "mbar"). null if not visible.
- "scale_min": number. Lowest value printed on the primary scale.
- "scale_max": number. Highest value printed on the primary scale.
- "confidence": number from 0 to 1. Your confidence that reading_value is within 2% of full scale of the true value. Lower it for glare, dirt, blur, steep angles, small or partly hidden dials, or ambiguous needles.
- "readable": boolean. false if the reading cannot be determined.
- "issues": array of strings from ["glare","dirty","blur","angled","low_light","small_in_frame","multiple_gauges","occluded","none"].
- "notes": string, at most 20 words. If several gauges are visible, say which one you read (read the largest, most central one).',
    files           => content,
    responseFormat  => '{"type":"json_object"}',
    failOnError     => false,
    modelParameters => named_struct('max_tokens', 16000)
  )                                   AS vlm
FROM STREAM read_files(
  '${gauge.raw_path}/images/',
  format          => 'binaryFile',
  pathGlobFilter  => '*.{jpg,jpeg,png}'
);
