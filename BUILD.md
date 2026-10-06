# How this was built (AI as a force multiplier)

## Tools
- **Claude Code** (via Isaac) with the Databricks agent skills (pipelines, Lakebase, Genie Agents, AI Functions, Apps, Bundles)
- Databricks CLI and Declarative Automation Bundles for deployment
- Conversation/session ID: `[record here for the submission form]`

## How AI was used
| Area | What AI did | What I decided or overrode |
|---|---|---|
| Architecture | Researched Lakebase write-back options | Rejected dual-write and writing to the synced table; chose a native overrides table + Lakehouse Sync (DECISIONS D4) |
| Data | Sourced CC-licensed gauge photos from Wikimedia Commons with licence metadata; screened candidates | Curated the final 30: dropped ambiguous or unstable dials, kept four hard cases on purpose |
| Model selection | Ran 15 vision models over every image and compared accuracy, confidence and batch support | Chose GPT-5.5 for batch support and informative confidence over higher-scoring models that can't run in batch (DECISIONS D11) |
| Pipeline | `[TBD]` | `[TBD]` |
| Prompt for the vision model | `[TBD: prompt versions and response schema]` | `[TBD]` |
| App | `[TBD]` | `[TBD]` |

## Key prompts and patterns
<!-- TODO: add representative prompts as the build progresses -->
