import { Badge, Button, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import { Bot, ChevronLeft, ChevronRight, Lightbulb, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { totalsOf, useModelUsage } from '../model/usage';
import { useReadings } from '../model/useReadings';
import { formatDateTime } from '../review/types';
import { STAGES, STEPS, type LiveContext, type Stage, type StageId } from './stages';

interface ReviewStats {
  decisions: number;
  lastDecisionAt: string | null;
}

function useReviewStats() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  useEffect(() => {
    fetch('/api/review-stats')
      .then((r) => (r.ok ? (r.json() as Promise<{ decisions: number; last_decision_at: string | null }>) : null))
      .then((b) => setStats(b ? { decisions: Number(b.decisions), lastDecisionAt: b.last_decision_at } : null))
      .catch(() => setStats(null));
  }, []);
  return stats;
}

const stageById = (id: StageId): Stage => STAGES.find((s) => s.id === id) ?? STAGES[0];

// Diagram design grid (SVG user units); the diagram scales to the card width.
const W = 1200;
const H = 515;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A clickable architecture component, drawn as HTML inside the SVG so text wraps and Tailwind tokens apply. */
function Component({
  box,
  stage,
  selected,
  onSelect,
  title,
  sub,
}: {
  box: Box;
  stage: Stage;
  selected: StageId;
  onSelect: (id: StageId) => void;
  title: string;
  sub: ReactNode;
}) {
  const Icon = stage.icon;
  const active = selected === stage.id;
  return (
    <foreignObject x={box.x} y={box.y} width={box.w} height={box.h}>
      <button
        type="button"
        onClick={() => onSelect(stage.id)}
        aria-pressed={active}
        className={`w-full h-full flex flex-col justify-start text-left rounded-lg border p-2.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          active ? 'border-brand-teal bg-brand-teal-soft ring-2 ring-brand-teal' : 'bg-card hover:border-brand-teal/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              active ? 'bg-brand-teal text-brand-teal-foreground' : 'bg-brand-navy text-brand-navy-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {stage.step !== null && (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal text-[11px] font-semibold text-brand-teal-foreground">
              {stage.step}
            </span>
          )}
          <span className="text-[15px] font-semibold text-foreground leading-tight">{title}</span>
        </div>
        {sub && <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{sub}</div>}
      </button>
    </foreignObject>
  );
}

function Zone({ box, label, tone }: { box: Box; label: string; tone: 'site' | 'platform' | 'pipeline' | 'people' }) {
  const cls = {
    site: 'fill-muted/60 stroke-border',
    people: 'fill-muted/60 stroke-border',
    platform: 'fill-brand-teal-soft/40 stroke-brand-teal/50',
    pipeline: 'fill-card stroke-brand-navy/30',
  }[tone];
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={14}
        className={cls}
        strokeWidth={1.5}
        strokeDasharray={tone === 'pipeline' ? '5 4' : undefined}
      />
      <text
        x={box.x + 14}
        y={tone === 'pipeline' ? box.y + box.h - 10 : box.y + 22}
        className={`text-[13px] font-semibold uppercase tracking-wider ${tone === 'platform' ? 'fill-brand-teal' : 'fill-muted-foreground'}`}
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({
  d,
  both,
  dashed,
  label,
  lx,
  ly,
}: {
  d: string;
  both?: boolean;
  dashed?: boolean;
  label?: string;
  lx?: number;
  ly?: number;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        className={dashed ? 'stroke-brand-teal' : 'stroke-brand-navy/70'}
        strokeWidth={dashed ? 2 : 1.6}
        strokeDasharray={dashed ? '6 4' : undefined}
        markerEnd={dashed ? 'url(#arrow-teal)' : 'url(#arrow)'}
        markerStart={both ? 'url(#arrow-start)' : undefined}
      />
      {label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor="middle" className="fill-muted-foreground text-[12px]">
          {label}
        </text>
      )}
    </g>
  );
}

function ArchitectureDiagram({ selected, onSelect }: { selected: StageId; onSelect: (id: StageId) => void }) {
  const C = (id: StageId, title: string, box: Box, sub: ReactNode) => (
    <Component box={box} stage={stageById(id)} selected={selected} onSelect={onSelect} title={title} sub={sub} />
  );
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[760px] h-auto"
        role="img"
        aria-label="Architecture diagram"
      >
        <defs>
          {[
            ['arrow', 'var(--brand-navy)', 'auto'],
            ['arrow-start', 'var(--brand-navy)', 'auto-start-reverse'],
            ['arrow-teal', 'var(--brand-teal)', 'auto'],
          ].map(([id, color, orient]) => (
            <marker
              key={id}
              id={id}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient={orient}
            >
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: color }} />
            </marker>
          ))}
        </defs>

        {/* Zones */}
        <Zone box={{ x: 10, y: 150, w: 160, h: 230 }} label="Inspection site" tone="site" />
        <Zone box={{ x: 190, y: 10, w: 820, h: 495 }} label="Databricks Data Intelligence Platform" tone="platform" />
        <Zone
          box={{ x: 210, y: 190, w: 525, h: 182 }}
          label="Lakeflow pipeline · runs when photos land"
          tone="pipeline"
        />
        <Zone box={{ x: 1030, y: 10, w: 160, h: 230 }} label="People" tone="people" />

        {/* Outside the platform */}
        <foreignObject x={25} y={205} width={130} height={120}>
          <button
            type="button"
            onClick={() => onSelect('land')}
            className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-card p-2 text-center shadow-sm hover:border-brand-teal/70"
          >
            <Bot className="h-7 w-7 text-brand-navy" />
            <span className="text-[15px] font-semibold text-foreground">Inspection robots</span>
            <span className="text-[12.5px] leading-snug text-muted-foreground">Photos + round metadata</span>
          </button>
        </foreignObject>
        <foreignObject x={1045} y={50} width={130} height={110}>
          <button
            type="button"
            onClick={() => onSelect('review')}
            className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-card p-2 text-center shadow-sm hover:border-brand-teal/70"
          >
            <Users className="h-7 w-7 text-brand-navy" />
            <span className="text-[15px] font-semibold text-foreground">Reviewers & operations</span>
            <span className="text-[12.5px] leading-snug text-muted-foreground">Review, correct, ask</span>
          </button>
        </foreignObject>

        {/* Lakeflow pipeline: steps 1-3 */}
        {C(
          'land',
          'Raw volume',
          { x: 225, y: 210, w: 150, h: 120 },
          <>Photos + metadata CSV; new files start the job</>
        )}
        {C(
          'read',
          'Bronze · AI read',
          { x: 395, y: 210, w: 150, h: 120 },
          <>Auto Loader + ai_query: each photo read once</>
        )}
        {C('refine', 'Silver → Gold', { x: 565, y: 210, w: 155, h: 120 }, <>Quality checks, limits, review status</>)}

        {/* Above the pipeline */}
        {C(
          'observe',
          'Unity AI Gateway',
          { x: 395, y: 45, w: 150, h: 100 },
          <>GPT-5.5; every call logged and costed</>
        )}
        {C('ask', 'Genie Agent', { x: 565, y: 45, w: 155, h: 100 }, <>Plain-English questions over gold</>)}

        {/* Serving and app */}
        {C('serve', 'Lakebase', { x: 790, y: 210, w: 200, h: 120 }, <>Synced copies of gold + review table</>)}
        {C('review', 'Databricks App', { x: 790, y: 45, w: 200, h: 100 }, <>Review queue, Genie, model & usage</>)}

        {/* Unity Catalog band */}
        {C(
          'govern',
          'Unity Catalog',
          { x: 210, y: 432, w: 780, h: 60 },
          <>Explicit grants · raw volume · lineage from photo to answer · model access (EXECUTE) · audit</>
        )}

        {/* Connectors */}
        <Arrow d="M155,265 L223,265" />
        <Arrow d="M375,270 L393,270" />
        <Arrow d="M545,270 L563,270" />
        <Arrow d="M470,208 L470,147" both />
        <Arrow d="M642,147 L642,208" label="SQL" lx={662} ly={172} />
        <Arrow d="M720,270 L788,270" label="sync" lx={754} ly={261} />
        <Arrow d="M890,208 L890,147" both label="reads · writes" lx={930} ly={182} />
        <Arrow d="M788,97 L722,97" label="Genie panel" lx={755} ly={89} />
        <Arrow d="M992,105 L1043,105" both />
        <Arrow d="M890,332 L890,397 L660,397 L660,332" dashed />

        {/* Step 6: Lakehouse Sync, on the loop */}
        {C('syncback', 'Lakehouse Sync', { x: 665, y: 376, w: 220, h: 42 }, null)}
      </svg>
    </div>
  );
}

function StageDetail({
  id,
  live,
  onSelect,
}: {
  id: StageId;
  live: LiveContext | null;
  onSelect: (id: StageId) => void;
}) {
  const s = stageById(id);
  const Icon = s.icon;
  const idx = STEPS.findIndex((x) => x.id === id);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-navy text-brand-navy-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-base font-semibold text-foreground leading-tight">
                {s.step !== null ? `Step ${s.step}: ${s.name}` : s.name}
              </div>
              <div className="text-xs font-medium text-brand-teal mt-0.5">{s.product}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous step"
              disabled={idx === 0}
              onClick={() => onSelect(idx < 0 ? STEPS[0].id : STEPS[idx - 1].id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next step"
              disabled={idx === STEPS.length - 1}
              onClick={() => onSelect(idx < 0 ? STEPS[0].id : STEPS[idx + 1].id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3 text-[13px] leading-snug [&_p]:leading-snug">
          <div className="space-y-3">
            <p className="text-foreground">{s.what}</p>
            <div className="flex items-center gap-2">
              <Badge className="bg-brand-teal text-brand-teal-foreground">Live</Badge>
              {live ? <span className="text-foreground">{s.live(live)}</span> : <Skeleton className="h-4 w-48" />}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Built with</div>
            <ul className="space-y-0.5">
              {s.objects.map((o) => (
                <li key={o}>
                  <code className="text-[11px] rounded bg-muted px-1.5 py-0.5">{o}</code>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 rounded-md bg-muted/60 p-2.5">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-brand-teal" />
            <p>
              <span className="font-medium">Why this design: </span>
              {s.why}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Live: Lakebase serving copies, review table and AI Gateway usage
            {live?.lastDecisionAt ? ` · last decision ${formatDateTime(live.lastDecisionAt)}` : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ArchitecturePage() {
  const [stage, setStage] = useState<StageId>('read');
  const readings = useReadings();
  const usage = useModelUsage();
  const reviewStats = useReviewStats();

  const live = useMemo((): LiveContext | null => {
    if (!readings.data) return null;
    const rs = readings.data.readings;
    const t = usage.days ? totalsOf(usage.days) : null;
    return {
      readings: rs.length,
      autoAccepted: rs.filter((r) => r.review_status === 'auto_accepted').length,
      pending: rs.filter((r) => r.needs_review).length,
      photosRead: t?.images ?? rs.length,
      modelCalls: t?.requests ?? 0,
      costPerReading: t?.costPerImage ?? null,
      decisions: reviewStats?.decisions ?? 0,
      lastReadAt: t?.lastCallAt ?? null,
      lastDecisionAt: reviewStats?.lastDecisionAt ?? null,
    };
  }, [readings.data, usage.days, reviewStats]);

  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">How it works</h2>
        <p className="text-sm text-muted-foreground mt-1">
          From robot photo to trusted answer on one governed platform. Follow the numbers; click any component to see
          what it does and why.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex items-center">
          <CardContent className="p-4 w-full">
            <ArchitectureDiagram selected={stage} onSelect={setStage} />
          </CardContent>
        </Card>
        <StageDetail id={stage} live={live} onSelect={setStage} />
      </div>
    </div>
  );
}
