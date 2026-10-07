import {
  Activity,
  Camera,
  Database,
  Layers,
  MessageSquareText,
  RefreshCcw,
  ScanEye,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/** Live numbers shown next to each stage (from the readings, model usage and review-stats APIs). */
export interface LiveContext {
  readings: number;
  autoAccepted: number;
  pending: number;
  photosRead: number;
  modelCalls: number;
  costPerReading: number | null;
  decisions: number;
  lastReadAt: string | null;
  lastDecisionAt: string | null;
}

export type StageId = 'land' | 'read' | 'refine' | 'serve' | 'review' | 'syncback' | 'ask' | 'govern' | 'observe';

export interface Stage {
  id: StageId;
  /** Numbered pipeline step, or null for the layers that span every step. */
  step: number | null;
  name: string;
  product: string;
  icon: LucideIcon;
  summary: string;
  what: string;
  objects: string[];
  why: string;
  live: (c: LiveContext) => string;
}

export const STAGES: Stage[] = [
  {
    id: 'land',
    step: 1,
    name: 'Land',
    product: 'Unity Catalog volume',
    icon: Camera,
    summary: 'Robot photos + round metadata',
    what: 'Inspection robots upload each round’s gauge photos, plus a metadata file with the gauge tag, site, process unit, robot and operating limit, to a governed raw volume. A file-arrival trigger starts the refresh job.',
    objects: [
      '/Volumes/…/pressure_gauge/raw/images/',
      '/Volumes/…/pressure_gauge/raw/metadata/',
      'Job: pressure-gauge-reader-refresh',
    ],
    why: 'Photos stay in the volume and the tables keep only the path, so serving stays small and photos are still governed by Unity Catalog.',
    live: (c) => `${c.readings} gauge photos landed in the latest rounds`,
  },
  {
    id: 'read',
    step: 2,
    name: 'Read',
    product: 'Lakeflow + ai_query + Unity AI Gateway',
    icon: ScanEye,
    summary: 'AI reads every dial once',
    what: 'Auto Loader picks up each new photo exactly once. ai_query sends it to GPT-5.5 through Unity AI Gateway and stores the reading, unit, dial scale, confidence and any image issues. Failed calls go to a quarantine table instead of stopping the pipeline.',
    objects: ['bronze_gauge_readings_ai (streaming table)', 'bronze_gauge_metadata', 'quarantine_vlm_errors'],
    why: 'The model is called inside a streaming table, so every photo is read and billed once — re-running the pipeline never re-reads a photo or changes a reviewed reading.',
    live: (c) => `${c.photosRead} photos read with ${c.modelCalls} model calls`,
  },
  {
    id: 'refine',
    step: 3,
    name: 'Refine',
    product: 'Lakeflow Declarative Pipelines',
    icon: Layers,
    summary: 'Quality checks + business rules',
    what: 'Silver parses the model’s answer and checks it (call succeeded, reading within the dial’s scale, unit present). Gold joins the gauge metadata and the latest human decision, applies each gauge’s operating limit and decides what needs review.',
    objects: [
      'silver_gauge_readings (expectations)',
      'gold_gauge_readings_final (materialized view)',
      'gold_vlm_usage_daily',
    ],
    why: 'Business rules such as “unexpectedly high” and “needs review” are calculated once in gold, so the app, Genie and any report always agree.',
    live: (c) => `${c.autoAccepted} auto-accepted · ${c.pending} flagged for a person`,
  },
  {
    id: 'serve',
    step: 4,
    name: 'Serve',
    product: 'Lakebase (Postgres)',
    icon: Database,
    summary: 'Low-latency copy for the app',
    what: 'After each pipeline run, the job refreshes Lakebase synced tables: a read-only Postgres copy of the gold readings and the model usage, so the review app answers in milliseconds.',
    objects: ['pressure_gauge.gauge_readings_serving (synced)', 'pressure_gauge.vlm_usage_serving (synced)'],
    why: 'Snapshot sync, because gold is a materialized view; at the size of an inspection round a full refresh takes seconds.',
    live: (c) => `${c.readings} readings in the serving copy`,
  },
  {
    id: 'review',
    step: 5,
    name: 'Review',
    product: 'Databricks App (this app)',
    icon: UserCheck,
    summary: 'People check flagged readings',
    what: 'Reviewers work through the queue: confirm the AI reading, override it with a reason, or mark the dial unreadable. Each decision is appended to an app-owned Lakebase table with who, when and why, and shows in the app immediately.',
    objects: ['review.reading_overrides (Lakebase, append-only)', 'App service principal: SELECT + INSERT only'],
    why: 'Synced tables are read-only, so decisions go to a separate table — and the app can insert but never update or delete, so the audit trail can’t be rewritten.',
    live: (c) => `${c.decisions} review decision${c.decisions === 1 ? '' : 's'} recorded`,
  },
  {
    id: 'syncback',
    step: 6,
    name: 'Sync back',
    product: 'Lakehouse Sync (CDC)',
    icon: RefreshCcw,
    summary: 'Decisions return to Delta',
    what: 'Every decision streams from Lakebase back into a Delta history table in Unity Catalog within moments. The next pipeline run folds the latest decision into gold, which then flows to the app and Genie.',
    objects: ['lb_reading_overrides_history (Delta, change history)', '→ gold_gauge_readings_final'],
    why: 'One source of truth in the lakehouse: corrections reach analytics and Genie, and the full history of decisions is kept.',
    live: (c) =>
      c.decisions ? `${c.decisions} decision${c.decisions === 1 ? '' : 's'} flowing back to gold` : 'No decisions yet',
  },
  {
    id: 'ask',
    step: 7,
    name: 'Ask',
    product: 'Genie Agent',
    icon: MessageSquareText,
    summary: 'Questions in plain English',
    what: 'Anyone can ask about the readings in plain English. Genie writes SQL over the gold table, shows it with the answer, and runs it with the signed-in user’s own permissions.',
    objects: ['Genie Agent: Gauge Inspection Readings', 'gold_gauge_readings_final'],
    why: 'One denormalised gold table with the business terms defined (operating limit, low confidence, human-corrected), so Genie never invents thresholds.',
    live: () => 'Open “Ask Genie” on the review page',
  },
  {
    id: 'govern',
    step: null,
    name: 'Govern',
    product: 'Unity Catalog',
    icon: ShieldCheck,
    summary: 'Grants, lineage, audit',
    what: 'Every object in the flow — raw volume, pipeline tables, synced tables and the model service — is governed in Unity Catalog, with explicit grants, lineage from photo to answer, and audit.',
    objects: [
      'account users: SELECT on gold only',
      'App service principal: READ VOLUME on raw',
      'Models: EXECUTE on system.ai',
      'Lineage: system.access.table_lineage',
    ],
    why: 'Least privilege by role: analysts never see raw photos or pipeline internals, and Genie runs as the signed-in user, so the same grants apply.',
    live: () => 'Grants and lineage captured in evidence/02_*.md',
  },
  {
    id: 'observe',
    step: null,
    name: 'Observe the AI',
    product: 'Unity AI Gateway',
    icon: Activity,
    summary: 'GPT-5.5, logged and costed',
    what: 'The pipeline calls GPT-5.5 by its Unity AI Gateway service name. Every call is logged with requester, tokens and status, and the pipeline turns that log into a daily usage and cost table for the AI model & usage page.',
    objects: [
      'system.ai.gpt-5-5 (model service)',
      'system.ai_gateway.usage',
      'gold_vlm_usage_daily → vlm_usage_serving',
    ],
    why: 'The model can be swapped or given a fallback without touching the pipeline, and every reading has a known cost.',
    live: (c) =>
      `${c.modelCalls} model calls logged${c.costPerReading !== null ? ` · $${c.costPerReading.toFixed(3)} per reading` : ''}`,
  },
];

/** The numbered steps, in order (used for previous / next). */
export const STEPS = STAGES.filter((s) => s.step !== null);
