# Genie Agent: questions, generated SQL and answers

_Captured 2026-10-07 12:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Which image readings have needed human intervention?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `image_id`, `gauge_id`, `site`, `ai_value`, `human_value`, `unit`, `override_reason`, `reviewed_by`, `reviewed_at` FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final` WHERE `is_human_corrected` = TRUE ORDER BY `reviewed_at` DESC
```

**Result:**

| image_id | gauge_id | site | ai_value | human_value | unit | override_reason | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|---|---|
| gauge_009.jpg | PI-3102 | Northbay Refinery | 5.0 | 1.0 | bar | Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end | alex.dmitrewski@databricks.com | 2026-10-06T13:28:01.398Z |

**Answer:** **1 image reading** needed human intervention: image ID **gauge_009.jpg** for gauge **PI-3102** at **Northbay Refinery**. The AI reading was **5.0 bar**, the human-corrected reading was **1.0 bar**, and the override reason was **"Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end"**; the review was completed by **alex.dmitrewski@databricks.com** on **2026-10-06T13:28:01.398Z**.

## Are any pressure readings unusually high?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT gold_gauge_readings_final.gauge_id, gold_gauge_readings_final.site, gold_gauge_readings_final.unit_area, gold_gauge_readings_final.captured_at, gold_gauge_readings_final.final_value, gold_gauge_readings_final.unit, gold_gauge_readings_final.normal_max, ROUND(try_divide(gold_gauge_readings_final.final_value,gold_gauge_readings_final.normal_max), 2) AS share_of_normal_max
FROM serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final
WHERE gold_gauge_readings_final.reading_status = 'high'
  AND gold_gauge_readings_final.final_value IS NOT NULL
  AND gold_gauge_readings_final.unit IS NOT NULL
  AND gold_gauge_readings_final.normal_max IS NOT NULL
  AND gold_gauge_readings_final.normal_max > 0
ORDER BY share_of_normal_max DESC, gold_gauge_readings_final.captured_at DESC
```

**Result:**

| gauge_id | site | unit_area | captured_at | final_value | unit | normal_max | share_of_normal_max |
|---|---|---|---|---|---|---|---|
| PI-3104 | Northbay Refinery | Steam & Utilities | 2026-09-29T18:10:00.000Z | 68.0 | psi | 60.0 | 1.13 |
| PI-3103 | Northbay Refinery | Steam & Utilities | 2026-10-04T06:45:00.000Z | 187.0 | psi | 175.0 | 1.07 |
| PI-2101 | Northbay Refinery | Hydrotreater | 2026-09-29T07:34:00.000Z | 20.0 | bar | 18.75 | 1.07 |
| PI-4108 | Northbay Refinery | Instrument Air | 2026-10-02T06:27:00.000Z | 620.0 | kPa | 615.0 | 1.01 |

**Answer:** Yes — **4 pressure readings** are flagged as unusually high, all at **Northbay Refinery**. Examples include:
- **PI-3104** in **Steam & Utilities**: **68.0 psi** vs normal max **60.0 psi**
- **PI-3103** in **Steam & Utilities**: **187.0 psi** vs normal max **175.0 psi**
- **PI-2101** in **Hydrotreater**: **20.0 bar** vs normal max **18.75 bar**
- **PI-4108** in **Instrument Air**: **620.0 kPa** vs normal max **615.0 kPa**
The largest excursion shown is **PI-3104**, at about **13% above** its normal maximum.

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

**Answer:** There are **9** readings still waiting for review. Based on the result set, the current count of readings with `needs_review = true` is **9**.

## Which dials could not be read, and why?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `image_id`, `gauge_id`, `site`, `unit_area`, `captured_at`, `unit`, `reading_status`, `review_status`, `vlm_issues` AS `reason`
FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final`
WHERE `reading_status` = 'unreadable'
  AND `captured_at` IS NOT NULL
ORDER BY `captured_at` DESC
```

**Result:**

| image_id | gauge_id | site | unit_area | captured_at | unit | reading_status | review_status | reason |
|---|---|---|---|---|---|---|---|---|
| gauge_004.jpg | PI-1101 | Northbay Refinery | Crude Distillation Unit | 2026-09-29T18:04:00.000Z | unknown | unreadable | pending_review | dirty, blur, glare |

**Answer:** The unreadable dial in the visible data is **gauge ID PI-1101** at **Northbay Refinery**, **Crude Distillation Unit**, from **image_id gauge_004.jpg** captured at **2026-09-29T18:04:00.000Z**; **reading_status = unreadable** and the recorded reason is **dirty, blur, glare**. In this 1-row result, the only unreadable dial is **PI-1101**, and the unit is listed as **unknown**.
