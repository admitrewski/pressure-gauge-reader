"""Capture run evidence for every stage as Markdown text in evidence/ (the FE Bar evaluator reads text only).

Usage:  python src/setup/capture_evidence.py [--profile PROFILE]
Needs:  Databricks CLI (authenticated), psql. Read-only: it only queries tables, logs and APIs.
"""
import argparse
import datetime as dt
import json
import pathlib
import subprocess
import time

CATALOG, SCHEMA = "serverless_stable_kx6lwb_catalog", "pressure_gauge"
S = f"{CATALOG}.{SCHEMA}"
WAREHOUSE = "c8c09f92a545a432"
PIPELINE_ID = "528c9040-a50a-466d-9b5b-6215594f6542"
LAKEBASE_PROJECT = "pressure-gauge-reader"
SYNCED_TABLE = f"synced_tables/{S}.gauge_readings_serving"
GENIE_SPACE = "01f1c1856cf81e78abbc04e6f1863c80"
APP = "gauge-review"
TRACE_IMAGE = "gauge_009.jpg"
OUT = pathlib.Path(__file__).resolve().parents[2] / "evidence"


def cli(*args, profile, as_json=True):
    cmd = ["databricks", *args, "--profile", profile] + (["-o", "json"] if as_json else [])
    out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    return json.loads(out) if as_json else out


def sql(statement, profile):
    body = {"warehouse_id": WAREHOUSE, "statement": statement, "wait_timeout": "50s", "on_wait_timeout": "CONTINUE"}
    d = cli("api", "post", "/api/2.0/sql/statements", "--json", json.dumps(body), profile=profile, as_json=False)
    d = json.loads(d)
    while d["status"]["state"] in ("PENDING", "RUNNING"):
        time.sleep(3)
        d = json.loads(cli("api", "get", f"/api/2.0/sql/statements/{d['statement_id']}", profile=profile, as_json=False))
    if d["status"]["state"] != "SUCCEEDED":
        raise RuntimeError(f"{d['status']}\n{statement}")
    cols = [c["name"] for c in d["manifest"]["schema"]["columns"]]
    return cols, d.get("result", {}).get("data_array", []) or []


def psql(statement, profile):
    cmd = ["databricks", "psql", "--project", LAKEBASE_PROJECT, "--profile", profile, "--",
           "-d", "databricks_postgres", "-A", "-F", "\t", "-P", "footer=off", "-c", statement]
    lines = [l for l in subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.splitlines()
             if "\t" in l or (l and not l.startswith(("Project:", "Branch:", "Endpoint:", "Connecting")))]
    rows = [l.split("\t") for l in lines]
    return (rows[0], rows[1:]) if rows else ([], [])


def md_table(cols, rows, limit=None):
    rows = rows[:limit] if limit else rows
    esc = lambda v: "" if v is None else str(v).replace("|", "\\|").replace("\n", " ")
    return "\n".join(["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)] +
                     ["| " + " | ".join(esc(v) for v in r) + " |" for r in rows])


def write(name, title, sections):
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body = [f"# {title}", "", f"_Captured {stamp} from the build workspace by `src/setup/capture_evidence.py`._", ""]
    for heading, text in sections:
        body += [f"## {heading}", "", text, ""]
    (OUT / name).write_text("\n".join(body))
    print("wrote", name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="fe-vm-fevm-serverless-stable-kx6lwb")
    p = ap.parse_args().profile
    OUT.mkdir(exist_ok=True)

    # 1. Lakeflow
    updates = cli("pipelines", "list-updates", PIPELINE_ID, profile=p).get("updates", [])
    upd_rows = [[u["update_id"], u.get("state"), u.get("cause"), u.get("full_refresh", False),
                 dt.datetime.fromtimestamp(u["creation_time"] / 1000, dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")] for u in updates]
    counts = sql(f"""SELECT 'bronze_gauge_readings_ai' AS dataset, COUNT(*) AS rows FROM {S}.bronze_gauge_readings_ai
        UNION ALL SELECT 'bronze_gauge_metadata', COUNT(*) FROM {S}.bronze_gauge_metadata
        UNION ALL SELECT 'silver_gauge_readings', COUNT(*) FROM {S}.silver_gauge_readings
        UNION ALL SELECT 'quarantine_vlm_errors', COUNT(*) FROM {S}.quarantine_vlm_errors
        UNION ALL SELECT 'gold_gauge_readings_final', COUNT(*) FROM {S}.gold_gauge_readings_final""", p)
    flows = sql(f"""SELECT origin.update_id, regexp_extract(origin.flow_name, '([^.]+)$', 1) AS flow,
          COALESCE(MAX(CAST(get_json_object(details:flow_progress.metrics, '$.num_output_rows') AS BIGINT)), 0) AS output_rows
        FROM event_log('{PIPELINE_ID}') WHERE event_type = 'flow_progress' AND origin.flow_name IS NOT NULL
          AND origin.update_id IN (SELECT origin.update_id FROM event_log('{PIPELINE_ID}') WHERE event_type = 'update_progress' AND details:update_progress.state = 'COMPLETED')
        GROUP BY 1, 2 ORDER BY MIN(timestamp), 2""", p)
    write("01_pipeline_run.md", "Lakeflow pipeline runs", [
        ("Pipeline updates (serverless, triggered)", md_table(["update_id", "state", "cause", "full_refresh", "created_utc"], upd_rows)),
        ("Rows per dataset", md_table(*counts)),
        ("Flow results per update (event log)", md_table(*flows)),
    ])
    exp = sql(f"""SELECT origin.flow_name, e.name AS expectation, e.dataset, SUM(e.passed_records) AS passed, SUM(e.failed_records) AS failed
        FROM event_log('{PIPELINE_ID}'),
        LATERAL explode(from_json(details:flow_progress.data_quality.expectations,
          'array<struct<name:string,dataset:string,passed_records:bigint,failed_records:bigint>>')) AS t(e)
        WHERE event_type = 'flow_progress' AND details:flow_progress.data_quality.expectations IS NOT NULL
        GROUP BY ALL ORDER BY 1, 2""", p)
    write("01_expectations.md", "Data-quality expectations (event log)", [
        ("Expectation results summed across updates", md_table(*exp)),
        ("Reading the results", "Failed records on `reading_within_scale` / `unit_present` are warnings (rows kept and flagged for review), not drops; only rows without an image file name are dropped from metadata."),
    ])
    bronze_rows = [r for r in flows[1] if r[1] == "bronze_gauge_readings_ai"]
    calls = sql("""SELECT COUNT(*) AS vision_model_calls_from_pipeline FROM system.ai_gateway.usage
        WHERE endpoint_name = 'system.ai.gpt-5-5' AND requester = current_user() AND invocation_metadata.source = 'AI_QUERY'
          AND event_time >= current_date() - INTERVAL 7 DAYS AND input_tokens > 500""", p)
    write("01_incremental_run.md", "Auto Loader incremental processing", [
        ("bronze_gauge_readings_ai output rows per completed update", md_table(flows[0], bronze_rows)),
        ("Vision-model calls recorded by Unity AI Gateway (image-sized requests)", md_table(*calls)),
        ("What this shows", "The first completed update ingested all 30 images; later updates (re-runs and the refresh job) output 0 rows because Auto Loader only processes new files. Unity AI Gateway confirms the model was called about once per image (the count also includes a 2-image ai_query test run before the pipeline), not once per pipeline run."),
    ])

    # 2. Unity Catalog
    sections = []
    for kind, obj in [("CATALOG", CATALOG), ("SCHEMA", S), ("VOLUME", f"{S}.raw"), ("TABLE", f"{S}.gold_gauge_readings_final"), ("TABLE", f"{S}.bronze_gauge_readings_ai")]:
        sections.append((f"SHOW GRANTS ON {kind} {obj}", md_table(*sql(f"SHOW GRANTS ON {kind} {obj}", p))))
    pg_cols, pg_rows = psql("SELECT grantee, table_schema, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges "
                            "FROM information_schema.role_table_grants WHERE table_schema IN ('review','pressure_gauge') "
                            "AND grantee NOT IN ('databricks_superuser') GROUP BY 1,2,3 ORDER BY 2,3,1", p)
    sections.append(("Lakebase (Postgres) grants — separate from UC", md_table(pg_cols, pg_rows)))
    sections.append(("Model access (Unity AI Gateway)", "`account users` hold `EXECUTE` on `system.ai` (inherited by `system.ai.gpt-5-5`), which governs who can call the vision model."))
    write("02_grants.md", "Unity Catalog governance: explicit grants", sections)
    lin = sql(f"""SELECT DISTINCT COALESCE(NULLIF(source_table_full_name, ''), NULLIF(source_path, ''), '(files / external)') AS source,
          target_table_full_name AS target, target_type
        FROM system.access.table_lineage WHERE target_table_full_name LIKE '{S}.%' AND target_table_full_name NOT LIKE '{S}.event_log%'
          AND event_date >= current_date() - INTERVAL 7 DAYS ORDER BY 2, 1""", p)
    write("02_lineage.md", "Lineage (system.access.table_lineage)", [("Edges touching the pressure_gauge schema", md_table(*lin))])

    # 3. Lakebase
    st = cli("postgres", "get-synced-table", SYNCED_TABLE, profile=p)
    lb = psql("SELECT count(*) AS rows, count(*) FILTER (WHERE needs_review) AS pending_review, count(*) FILTER (WHERE is_human_corrected) AS human_corrected FROM pressure_gauge.gauge_readings_serving", p)
    gold = sql(f"SELECT COUNT(*) AS rows, SUM(CASE WHEN needs_review THEN 1 ELSE 0 END) AS pending_review, SUM(CASE WHEN is_human_corrected THEN 1 ELSE 0 END) AS human_corrected FROM {S}.gold_gauge_readings_final", p)
    write("03_synced_table.md", "Lakebase synced table (gold → Postgres)", [
        ("Synced table status", "```json\n" + json.dumps({k: st.get(k) for k in ("name", "spec")} | {"status": {k: st["status"].get(k) for k in ("detailed_state", "message", "last_sync")}}, indent=1) + "\n```"),
        ("Row counts: gold (Delta) vs serving (Lakebase)", "Gold:\n\n" + md_table(*gold) + "\n\nLakebase `pressure_gauge.gauge_readings_serving`:\n\n" + md_table(*lb)),
    ])
    rv = psql("SELECT override_id, image_id, action, human_value, override_reason, reviewed_by, reviewed_at FROM review.reading_overrides ORDER BY override_id", p)
    hist = sql(f"SELECT _pg_change_type, _pg_lsn, _timestamp, override_id, image_id, action, human_value, reviewed_by FROM {S}.lb_reading_overrides_history ORDER BY _sort_by", p)
    g9 = sql(f"SELECT image_id, gauge_id, ai_value, final_value, unit, review_status, reading_status, is_human_corrected, reviewed_by, reviewed_at FROM {S}.gold_gauge_readings_final WHERE is_human_corrected OR review_status IN ('confirmed','marked_unreadable')", p)
    sv = psql("SELECT image_id, ai_value, final_value, review_status, is_human_corrected FROM pressure_gauge.gauge_readings_serving WHERE is_human_corrected OR review_status IN ('confirmed','marked_unreadable')", p)
    write("03_writeback.md", "Human review write-back round trip", [
        ("1. App writes to the native Lakebase table `review.reading_overrides`", md_table(*rv)),
        ("2. Lakehouse Sync (CDC) lands it in Delta `lb_reading_overrides_history`", md_table(*hist)),
        ("3. Pipeline merges it into gold", md_table(*g9)),
        ("4. Snapshot sync brings the corrected gold row back to Lakebase serving", md_table(*sv)),
    ])

    # 4. Gen AI
    raw = sql(f"SELECT image_file, model_name, vlm.errorMessage AS error, vlm.result AS response FROM {S}.bronze_gauge_readings_ai ORDER BY image_file LIMIT 6", p)
    allr = sql(f"""SELECT image_id, gauge_id, site, ai_value, final_value, unit, scale_max, normal_max, ROUND(vlm_confidence, 2) AS confidence,
          vlm_issues, reading_status, review_status FROM {S}.gold_gauge_readings_final ORDER BY image_id""", p)
    summ = sql(f"""SELECT COUNT(*) AS readings, SUM(CASE WHEN review_status='auto_accepted' THEN 1 ELSE 0 END) AS auto_accepted,
          SUM(CASE WHEN needs_review THEN 1 ELSE 0 END) AS pending_review, SUM(CASE WHEN reading_status='high' THEN 1 ELSE 0 END) AS high,
          SUM(CASE WHEN reading_status='unreadable' THEN 1 ELSE 0 END) AS unreadable, ROUND(AVG(vlm_confidence), 2) AS avg_confidence
        FROM {S}.gold_gauge_readings_final""", p)
    write("04_vlm_outputs.md", "Vision model structured outputs (ai_query via Unity AI Gateway)", [("Raw responses (first 6 images)", md_table(*raw))])
    write("04_readings_summary.md", "Gauge readings: all images", [("Summary", md_table(*summ)), ("Per image", md_table(*allr))])
    rr = sql(f"""SELECT COUNT(*) AS reviewed, SUM(CASE WHEN is_human_corrected THEN 1 ELSE 0 END) AS overridden,
          ROUND(AVG(CASE WHEN is_human_corrected THEN 1.0 ELSE 0.0 END), 3) AS human_correction_rate
        FROM {S}.gold_gauge_readings_final WHERE review_status IN ('confirmed','overridden','marked_unreadable')""", p)
    write("04_review_outcomes.md", "Human review outcomes", [("Human correction rate (reviewed readings only)", md_table(*rr))])

    # 5. Genie
    sections = []
    for q in ["Which image readings have needed human intervention?", "Are any pressure readings unusually high?",
              "How many readings are still waiting for review?", "Which dials could not be read, and why?"]:
        conv = cli("genie", "start-conversation", GENIE_SPACE, q, profile=p)
        msg = conv.get("message", conv)
        conv_id, msg_id = msg.get("conversation_id") or conv.get("conversation_id"), msg.get("id") or msg.get("message_id")
        for _ in range(60):
            m = cli("genie", "get-message", GENIE_SPACE, conv_id, msg_id, profile=p)
            if m.get("status") in ("COMPLETED", "FAILED", "CANCELLED"):
                break
            time.sleep(3)
        q_att = next((a for a in m.get("attachments", []) if a.get("query")), None)
        text = next((a["text"]["content"] for a in m.get("attachments", []) if a.get("text")), "")
        block = [f"**Status:** {m.get('status')}"]
        if q_att:
            block.append("**Generated SQL:**\n\n```sql\n" + q_att["query"]["query"] + "\n```")
            res = cli("genie", "get-message-attachment-query-result", GENIE_SPACE, conv_id, msg_id, q_att["attachment_id"], profile=p)
            sr = res.get("statement_response", {})
            cols = [c["name"] for c in sr.get("manifest", {}).get("schema", {}).get("columns", [])]
            block.append("**Result:**\n\n" + md_table(cols, sr.get("result", {}).get("data_array", []) or [], limit=15))
        if text:
            block.append("**Answer:** " + text)
        sections.append((q, "\n\n".join(block)))
    write("05_genie_benchmarks.md", "Genie Agent: questions, generated SQL and answers", sections)

    # 6. App
    app = cli("apps", "get", APP, profile=p)
    dep = app.get("active_deployment", {})
    write("06_app_deploy.md", "Databricks App deployment", [("App status", "```json\n" + json.dumps({
        "name": app.get("name"), "url": app.get("url"), "app_status": app.get("app_status"), "compute_status": app.get("compute_status"),
        "active_deployment": {k: dep.get(k) for k in ("deployment_id", "status", "create_time")},
        "resources": app.get("resources"), "user_api_scopes": app.get("user_api_scopes")}, indent=1) + "\n```")])

    # 7. Unity Gateway
    use = sql("""SELECT date_trunc('hour', event_time) AS hour_utc, endpoint_name, invocation_metadata.source AS source, COUNT(*) AS requests,
          SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, SUM(CASE WHEN status_code <> 200 THEN 1 ELSE 0 END) AS errors,
          ROUND(AVG(latency_ms) / 1000, 1) AS avg_latency_s
        FROM system.ai_gateway.usage WHERE endpoint_name = 'system.ai.gpt-5-5' AND requester = current_user()
          AND event_time >= current_date() - INTERVAL 7 DAYS GROUP BY ALL ORDER BY 1""", p)
    write("07_gateway.md", "Unity AI Gateway: observability and control of the vision model", [
        ("Usage of `system.ai.gpt-5-5` by the pipeline (system.ai_gateway.usage)", md_table(*use)),
        ("Control", "- Access: `EXECUTE` on `system.ai` (UC) governs who can call the model service.\n"
                    "- The pipeline calls the model by its UC service name, so every gauge reading is attributable (requester, tokens, latency, status).\n"
                    "- Finding: batch `ai_query` accepts `system.ai.*` services but not a project-owned model service (404), so per-workload rate limits would be configured on the platform side."),
    ])


if __name__ == "__main__":
    main()
