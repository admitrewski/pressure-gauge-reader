# Data
- `images/`: 30 publicly licensed photographs of analog pressure gauges (`gauge_001–030.jpg`), mostly clear dials plus a few deliberately hard cases (unreadable, small/far, caged). Licence and attribution for each image are in `SOURCES.md`; the `condition` tags are in `metadata/image_manifest.csv`.
- `metadata/gauge_metadata.csv`: **synthetic** metadata per image: `image_file, gauge_id, site, unit_area, captured_at, robot_id, normal_max_override` (blank = default rule, DECISIONS D14).
- `metadata/image_manifest.csv`: image provenance only (source, licence, author, condition tag). Not a pipeline input.

There are no hand-labelled readings: the vision model produces each reading and a confidence score, and reviewers correct readings in the app. No customer data; all site, asset and robot identifiers are fictional.
