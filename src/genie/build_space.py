"""Builds the serialized definition of the "Gauge Inspection Readings" Genie Agent.

Usage:
    python src/genie/build_space.py <catalog>.<schema> > /tmp/space.json
    databricks genie create-space <WAREHOUSE_ID> "$(cat /tmp/space.json)" --title "Gauge Inspection Readings" ...

Context is added structurally (column descriptions, synonyms, example SQL) rather than as free-text
instructions, so the definitions of "high", "needs review" and "human intervention" come from the
gold table itself (DECISIONS D6).
"""
import json
import sys
import uuid


def newid() -> str:
    return uuid.uuid4().hex


def build(fq_schema: str) -> dict:
    table = f"{fq_schema}.gold_gauge_readings_final"
    t = "gold_gauge_readings_final"

    columns = [
        dict(column_name="image_id", description=["Inspection image file the reading came from (one row per image)."], synonyms=["image", "photo", "inspection image"]),
        dict(column_name="gauge_id", description=["Pressure indicator tag from the asset register, e.g. PI-2101."], synonyms=["gauge", "tag", "instrument", "pressure indicator"], enable_entity_matching=True),
        dict(column_name="site", description=["Plant or terminal where the gauge is installed."], synonyms=["plant", "facility", "location"], enable_format_assistance=True, enable_entity_matching=True),
        dict(column_name="unit_area", description=["Process unit or area of the site."], synonyms=["unit", "area", "process unit"], enable_format_assistance=True, enable_entity_matching=True),
        dict(column_name="captured_at", description=["When the inspection robot photographed the gauge."], synonyms=["inspection time", "date taken", "round time"]),
        dict(column_name="robot_id", description=["Inspection robot that captured the image."], synonyms=["robot"], enable_entity_matching=True),
        dict(column_name="final_value", description=["Trusted pressure reading: the reviewer's value if a human overrode it, otherwise the AI reading. NULL when the dial is unreadable."], synonyms=["reading", "pressure", "value", "pressure reading"]),
        dict(column_name="unit", description=["Pressure unit printed on the dial (bar, psi, kPa, MPa, kg/cm2, ...). Readings in different units must not be summed or averaged together."], synonyms=["units"]),
        dict(column_name="normal_max", description=["Normal operating maximum for the gauge: the asset-register limit if set, otherwise 75% of full scale."], synonyms=["operating limit", "normal maximum", "threshold"]),
        dict(column_name="pct_of_scale", description=["final_value as a fraction of the dial's full scale (0-1)."], synonyms=["percent of scale", "% of full scale"]),
        dict(column_name="reading_status", description=["'high' = reading above normal_max (unexpectedly high reading / excursion); 'normal'; 'unreadable' = no reading could be taken."], synonyms=["status", "unexpectedly high", "unusually high", "excursion", "over limit", "abnormal"], enable_format_assistance=True),
        dict(column_name="review_status", description=["'auto_accepted' (AI reading trusted), 'pending_review' (waiting for a reviewer), 'confirmed' (reviewer agreed with AI), 'overridden' (reviewer corrected the value), 'marked_unreadable'."], synonyms=["review state"], enable_format_assistance=True),
        dict(column_name="needs_review", description=["True when the reading is still waiting for a human reviewer."], synonyms=["pending review", "review queue", "awaiting review"]),
        dict(column_name="is_human_corrected", description=["True when a reviewer overrode the AI reading (human intervention)."], synonyms=["human intervention", "manual correction", "overridden", "corrected", "override"]),
        dict(column_name="ai_value", description=["Reading produced by the vision model before any human review."], synonyms=["AI reading", "model reading", "original reading"]),
        dict(column_name="vlm_confidence", description=["Vision model's confidence in its reading, 0-1. Below 0.7 is sent to review."], synonyms=["confidence", "model confidence", "AI confidence"]),
        dict(column_name="vlm_readable", description=["False when the vision model could not read the dial."], synonyms=["readable"]),
        dict(column_name="vlm_issues", description=["Image problems reported by the model, comma-separated (glare, dirty, blur, angled, small_in_frame, ...)."], synonyms=["issues", "image problems", "why unreadable"]),
        dict(column_name="human_value", description=["Value entered by the reviewer when overriding."], synonyms=["corrected value", "reviewer value"]),
        dict(column_name="override_reason", description=["Reviewer's reason for the decision."], synonyms=["reason", "correction reason"]),
        dict(column_name="reviewed_by", description=["Reviewer who made the decision."], synonyms=["reviewer"]),
        dict(column_name="reviewed_at", description=["When the review decision was made."], synonyms=["review time"]),
        dict(column_name="image_path", exclude=True),
        dict(column_name="vlm_notes", exclude=True),
        dict(column_name="vlm_error", exclude=True),
        dict(column_name="model_name", exclude=True),
        dict(column_name="read_at", exclude=True),
        dict(column_name="scale_min", description=["Lowest value printed on the dial."]),
        dict(column_name="scale_max", description=["Highest value printed on the dial (full scale)."], synonyms=["full scale", "range"]),
    ]

    sample_questions = [
        "Which image readings have needed human intervention?",
        "Are any pressure readings unexpectedly high?",
        "How many readings are still waiting for review?",
        "Which dials could not be read, and why?",
        "Which site has the most unexpectedly high readings?",
    ]

    example_sqls = [
        ("Which image readings have needed human intervention?",
         f"SELECT {t}.image_id, {t}.gauge_id, {t}.site, {t}.ai_value, {t}.human_value, {t}.unit, {t}.override_reason, {t}.reviewed_by, {t}.reviewed_at "
         f"FROM {table} WHERE {t}.is_human_corrected ORDER BY {t}.reviewed_at DESC"),
        ("Are any pressure readings unexpectedly high?",
         f"SELECT {t}.gauge_id, {t}.site, {t}.unit_area, {t}.final_value, {t}.unit, {t}.normal_max, {t}.pct_of_scale, {t}.captured_at "
         f"FROM {table} WHERE {t}.reading_status = 'high' ORDER BY {t}.pct_of_scale DESC"),
        ("What share of readings were corrected by a reviewer, by site?",
         f"SELECT {t}.site, COUNT(*) AS readings, SUM(CASE WHEN {t}.is_human_corrected THEN 1 ELSE 0 END) AS corrected, "
         f"ROUND(AVG(CASE WHEN {t}.is_human_corrected THEN 1.0 ELSE 0.0 END), 3) AS correction_rate FROM {table} GROUP BY {t}.site ORDER BY {t}.site"),
    ]

    benchmarks = [
        ("Which readings need human review right now?",
         f"SELECT {t}.image_id, {t}.gauge_id, {t}.vlm_confidence, {t}.reading_status FROM {table} WHERE {t}.needs_review ORDER BY {t}.vlm_confidence"),
        ("Which gauges could not be read?",
         f"SELECT {t}.gauge_id, {t}.image_id, {t}.vlm_issues FROM {table} WHERE {t}.reading_status = 'unreadable'"),
        ("How many readings are high at each site?",
         f"SELECT {t}.site, COUNT(*) AS high_readings FROM {table} WHERE {t}.reading_status = 'high' GROUP BY {t}.site ORDER BY high_readings DESC"),
        ("Which readings has a human overridden?",
         f"SELECT {t}.image_id, {t}.gauge_id, {t}.ai_value, {t}.human_value FROM {table} WHERE {t}.is_human_corrected"),
    ]

    payload = {
        "version": 2,
        "config": {"sample_questions": sorted([{"id": newid(), "question": [q]} for q in sample_questions], key=lambda x: x["id"])},
        "data_sources": {"tables": [{"identifier": table, "column_configs": sorted(columns, key=lambda c: c["column_name"])}]},
        "instructions": {
            "example_question_sqls": sorted(
                [{"id": newid(), "question": [q], "sql": [s]} for q, s in example_sqls], key=lambda x: x["id"]),
            "text_instructions": [{"id": newid(), "content": [
                "## Instructions you must follow when providing summaries\n"
                "- Always state the pressure unit with every reading, and never add or average readings with different units.\n"
                "- When listing high readings, include the gauge's normal_max so the excursion is clear.\n"
            ]}],
        },
        "benchmarks": {"questions": sorted(
            [{"id": newid(), "question": [q], "answer": [{"format": "SQL", "content": [s]}]} for q, s in benchmarks],
            key=lambda x: x["id"])},
    }
    return payload


if __name__ == "__main__":
    print(json.dumps(build(sys.argv[1] if len(sys.argv) > 1 else "serverless_stable_kx6lwb_catalog.pressure_gauge")))
