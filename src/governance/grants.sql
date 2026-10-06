-- Explicit, least-privilege Unity Catalog grants (DECISIONS D7).
-- `account users` stands in for the ops analysts / reviewers group (the build workspace only has built-in groups).
-- The pipeline runs as its owner; the app service principal is granted in grants_app_sp.sql after deployment.

-- Analysts / reviewers: query the governed gold table (Genie runs on their behalf), nothing upstream.
GRANT USE CATALOG ON CATALOG serverless_stable_kx6lwb_catalog TO `account users`;
GRANT USE SCHEMA  ON SCHEMA  serverless_stable_kx6lwb_catalog.pressure_gauge TO `account users`;
GRANT SELECT      ON TABLE   serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final TO `account users`;
