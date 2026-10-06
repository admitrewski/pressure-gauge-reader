# Bundle resources
- `gauge_pipeline.pipeline.yml`: Lakeflow SDP pipeline (serverless, triggered)
- `gauge_pipeline.job.yml`: job that runs the pipeline on file arrival in the raw volume
- `gauge_review.app.yml`: Databricks App, with volume, warehouse, Lakebase and Genie resources

Lakebase synced tables and Lakehouse Sync are set up with the CLI (`src/lakebase/`), because bundles don't yet support them.
