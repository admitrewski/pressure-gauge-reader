# Vision model structured outputs (ai_query via Unity AI Gateway)

_Captured 2026-10-07 15:33 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Raw responses (first 6 images)

| image_file | model_name | error | response |
|---|---|---|---|
| gauge_001.jpg | system.ai.gpt-5-5 |  | {"reading_value":20.0,"unit":"bar","scale_min":0,"scale_max":25,"confidence":0.88,"readable":true,"issues":["angled"],"notes":"Single central gauge; needle points at about 20 bar."} |
| gauge_002.jpg | system.ai.gpt-5-5 |  | {"reading_value":4.1,"unit":"psi","scale_min":0,"scale_max":8,"confidence":0.58,"readable":true,"issues":["angled","small_in_frame"],"notes":"Read the small gauge at upper right."} |
| gauge_003.jpg | system.ai.gpt-5-5 |  | {"reading_value":190,"unit":"psi","scale_min":0,"scale_max":300,"confidence":0.42,"readable":true,"issues":["blur","small_in_frame"],"notes":"Read the single central gauge; dial is small and blurry."} |
| gauge_004.jpg | system.ai.gpt-5-5 |  | {"reading_value":null,"unit":null,"scale_min":null,"scale_max":null,"confidence":0,"readable":false,"issues":["dirty","blur","glare"],"notes":"Dial face dirty; scale markings and unit unreadable."} |
| gauge_005.jpg | system.ai.gpt-5-5 |  | {"reading_value":10.0,"unit":"kg/cm²","scale_min":0,"scale_max":40,"confidence":0.86,"readable":true,"issues":["multiple_gauges"],"notes":"Read the right central pressure gauge."} |
| gauge_006.jpg | system.ai.gpt-5-5 |  | {"reading_value":0.2,"unit":"kg/cm2","scale_min":0,"scale_max":4,"confidence":0.42,"readable":true,"issues":["small_in_frame","occluded","angled"],"notes":"Read the protected pressure gauge in the yellow cage."} |
