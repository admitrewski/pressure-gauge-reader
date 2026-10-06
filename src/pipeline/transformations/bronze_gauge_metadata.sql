-- Bronze: synthetic gauge / inspection-round metadata (one CSV row per image), ingested with Auto Loader.
CREATE OR REFRESH STREAMING TABLE bronze_gauge_metadata (
  CONSTRAINT image_file_present EXPECT (image_file IS NOT NULL) ON VIOLATION DROP ROW,
  CONSTRAINT gauge_id_present   EXPECT (gauge_id IS NOT NULL),
  CONSTRAINT captured_at_valid  EXPECT (captured_at IS NOT NULL)
)
COMMENT "Gauge register and inspection-round metadata per image (site, unit, robot, capture time, operating limit override)"
AS
SELECT
  image_file, gauge_id, site, unit_area, captured_at, robot_id, normal_max_override,
  _metadata.file_path  AS source_file,
  current_timestamp()  AS ingested_at
FROM STREAM read_files(
  '${gauge.raw_path}/metadata/',
  format      => 'csv',
  header      => true,
  schemaHints => 'image_file STRING, gauge_id STRING, site STRING, unit_area STRING, captured_at TIMESTAMP, robot_id STRING, normal_max_override DOUBLE'
);
