# Genie Agent: questions, generated SQL and answers

_Captured 2026-10-07 15:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Which image readings have needed human intervention?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `image_id`, `gauge_id`, `site`, `ai_value`, `human_value`, `unit`, `override_reason`, `reviewed_by`, `reviewed_at` FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final` WHERE `is_human_corrected` = true ORDER BY `reviewed_at` DESC
```

**Result:**

| image_id | gauge_id | site | ai_value | human_value | unit | override_reason | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|---|---|
| gauge_009.jpg | PI-3102 | Northbay Refinery | 5.0 | 1.0 | bar | Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end | alex.dmitrewski@databricks.com | 2026-10-06T13:28:01.398Z |

**Answer:** **1 image reading** needed human intervention: image ID **gauge_009.jpg** for gauge **PI-3102** at **Northbay Refinery** was changed from AI reading **5.0 bar** to human reading **1.0 bar**, with override reason **"Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end"**. The review was completed by **alex.dmitrewski@databricks.com** on **2026-10-06T13:28:01.398Z**, and in this result the only corrected reading is a **4.0 bar** difference between the AI and human values.

## Are any pressure readings unusually high?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT gold_gauge_readings_final.image_id, gold_gauge_readings_final.gauge_id, gold_gauge_readings_final.site, gold_gauge_readings_final.unit_area, gold_gauge_readings_final.captured_at, gold_gauge_readings_final.final_value, gold_gauge_readings_final.unit, gold_gauge_readings_final.normal_max
FROM serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final
WHERE gold_gauge_readings_final.reading_status = 'high'
  AND gold_gauge_readings_final.final_value IS NOT NULL
  AND gold_gauge_readings_final.normal_max IS NOT NULL
  AND gold_gauge_readings_final.unit IS NOT NULL
ORDER BY gold_gauge_readings_final.captured_at DESC
```

**Result:**

| image_id | gauge_id | site | unit_area | captured_at | final_value | unit | normal_max |
|---|---|---|---|---|---|---|---|
| gauge_013.jpg | PI-3103 | Northbay Refinery | Steam & Utilities | 2026-10-04T06:45:00.000Z | 187.0 | psi | 175.0 |
| gauge_030.jpg | PI-4108 | Northbay Refinery | Instrument Air | 2026-10-02T06:27:00.000Z | 620.0 | kPa | 615.0 |
| gauge_016.jpg | PI-3104 | Northbay Refinery | Steam & Utilities | 2026-09-29T18:10:00.000Z | 68.0 | psi | 60.0 |
| gauge_001.jpg | PI-2101 | Northbay Refinery | Hydrotreater | 2026-09-29T07:34:00.000Z | 20.0 | bar | 18.75 |

**Answer:** **Yes** — all **4** readings returned by the data are marked **high**, and each is above its stated normal maximum in its own pressure unit. Some high readings include:
- **PI-3103** at **187.0 psi** vs normal max **175.0 psi**
- **PI-4108** at **620.0 kPa** vs normal max **615.0 kPa**
- **PI-3104** at **68.0 psi** vs normal max **60.0 psi**
- **PI-2101** at **20.0 bar** vs normal max **18.75 bar**

The largest overage shown is **PI-3103**, which is **12.0 psi** above its normal maximum.

## How many readings are still waiting for review?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT COUNT(*) AS `readings_waiting_for_review`
FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final`
WHERE `needs_review` = TRUE
```

**Result:**

| readings_waiting_for_review |
|---|
| 9 |

**Answer:** There are **9** readings still waiting for review. In this result set of **1** row, the count of readings with `needs_review = true` is **9**.

## Which dials could not be read, and why?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `image_id`, `gauge_id`, `site`, `unit_area`, `captured_at`, `vlm_issues`, `review_status`, `reviewed_by`, `reviewed_at` FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final` WHERE `reading_status` = 'unreadable' ORDER BY `captured_at` DESC
```

**Result:**

| image_id | gauge_id | site | unit_area | captured_at | vlm_issues | review_status | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|---|---|
| gauge_004.jpg | PI-1101 | Northbay Refinery | Crude Distillation Unit | 2026-09-29T18:04:00.000Z | dirty, blur, glare | pending_review |  |  |

**Answer:** The unreadable dial was **gauge ID PI-1101** at **Northbay Refinery**, **Crude Distillation Unit**, from **image_id gauge_004.jpg** captured at **2026-09-29T18:04:00.000Z**. The dial could not be read because **vlm_issues = dirty, blur, glare**, and **review_status = pending_review** with **reviewed_by = null** and **reviewed_at = null**.
