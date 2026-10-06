-- Quarantine: images where the model call failed or returned unparseable output, for monitoring and re-processing.
CREATE OR REFRESH STREAMING TABLE quarantine_vlm_errors
COMMENT "Images whose vision-model call failed or returned unparseable JSON"
AS
SELECT image_file, image_path, model_name, read_at, vlm.errorMessage AS vlm_error, vlm.result AS vlm_response_raw
FROM STREAM(bronze_gauge_readings_ai)
WHERE vlm.errorMessage IS NOT NULL
   OR from_json(vlm.result, 'readable BOOLEAN').readable IS NULL;
