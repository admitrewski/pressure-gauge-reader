import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, ShieldCheck, Activity } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { totalsOf, useModelUsage } from '../model/usage';
import { useReadings } from '../model/useReadings';
import { formatDateTime, formatValue, imageUrl, type Reading } from '../review/types';
import { STAGES, type LiveContext, type StageId } from './stages';

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

/** The seven steps as one clickable flow, with the review loop and the governance layers underneath. */
function FlowDiagram({ selected, onSelect }: { selected: StageId; onSelect: (id: StageId) => void }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === selected;
            return (
              <div key={s.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={active}
                  className={`w-full h-full flex flex-col justify-start text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? 'border-brand-teal bg-brand-teal-soft ring-1 ring-brand-teal'
                      : 'bg-card hover:border-brand-teal/60 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        active ? 'bg-brand-teal text-brand-teal-foreground' : 'bg-brand-navy text-brand-navy-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">{s.step}</span>
                    <span className="font-semibold text-foreground">{s.name}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-brand-teal">{s.product}</div>
                  <div className="mt-1 text-xs text-muted-foreground leading-snug">{s.summary}</div>
                </button>
                {i < STAGES.length - 1 && (
                  <ChevronRight className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden xl:grid grid-cols-7 gap-3">
          <button
            type="button"
            onClick={() => onSelect('syncback')}
            className="col-start-3 col-end-7 flex items-center justify-center gap-2 rounded-b-lg border-x-2 border-b-2 border-dashed border-brand-teal/70 pt-1 pb-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 text-brand-teal" />
            Review loop: decisions from step 5 return through step 6 into gold (step 3) on the next run
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-brand-navy text-brand-navy-foreground p-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-brand-teal" />
            <div className="text-sm leading-snug">
              <span className="font-semibold">Unity Catalog governs every step</span>
              <span className="text-brand-navy-foreground/80">
                {' '}
                — explicit grants (analysts see gold only, the app reads photos read-only), lineage from photo to
                answer, and model access through EXECUTE on system.ai.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-brand-teal/50 bg-brand-teal-soft p-3">
            <Activity className="h-5 w-5 shrink-0 text-brand-teal" />
            <div className="text-sm leading-snug text-foreground">
              <span className="font-semibold">Unity AI Gateway observes the AI</span>
              <span className="text-muted-foreground">
                {' '}
                — every model call in step 2 is logged with requester, tokens and status, and costed per reading.{' '}
              </span>
              <Link to="/model" className="font-medium text-brand-teal hover:underline">
                AI model & usage →
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const idx = STAGES.findIndex((s) => s.id === id);
  const s = STAGES[idx];
  const Icon = s.icon;
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-brand-navy-foreground">
                <Icon className="h-4 w-4" />
              </span>
              Step {s.step}: {s.name}
            </CardTitle>
            <CardDescription className="mt-1 text-brand-teal font-medium">{s.product}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous step"
              disabled={idx === 0}
              onClick={() => onSelect(STAGES[idx - 1].id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next step"
              disabled={idx === STAGES.length - 1}
              onClick={() => onSelect(STAGES[idx + 1].id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-foreground leading-relaxed">{s.what}</p>
        <div className="flex items-center gap-2">
          <Badge className="bg-brand-teal text-brand-teal-foreground">Live</Badge>
          {live ? <span className="text-foreground">{s.live(live)}</span> : <Skeleton className="h-4 w-48" />}
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Built with</div>
          <ul className="space-y-1">
            {s.objects.map((o) => (
              <li key={o}>
                <code className="text-xs rounded bg-muted px-1.5 py-0.5">{o}</code>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2 rounded-md bg-muted/60 p-3">
          <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-brand-teal" />
          <p>
            <span className="font-medium">Why this design: </span>
            {s.why}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function flagReasons(r: Reading, threshold: number): string[] {
  const reasons: string[] = [];
  if (r.vlm_readable === false) reasons.push('the dial was unreadable');
  else if (r.vlm_confidence !== null && r.vlm_confidence < threshold)
    reasons.push(`confidence ${Math.round(r.vlm_confidence * 100)}% is below ${Math.round(threshold * 100)}%`);
  if (r.ai_value !== null && r.normal_max !== null && r.ai_value > r.normal_max)
    reasons.push(`above the operating limit of ${formatValue(r.normal_max, r.unit)}`);
  return reasons;
}

interface TraceEvent {
  stage: StageId;
  title: string;
  detail?: string;
  at?: string | null;
  muted?: boolean;
}

function traceOf(r: Reading, threshold: number): TraceEvent[] {
  const reasons = flagReasons(r, threshold);
  const reviewed = ['confirmed', 'overridden', 'marked_unreadable'].includes(r.review_status);
  const decision =
    r.review_status === 'overridden'
      ? `Overridden to ${formatValue(r.human_value, r.unit)}`
      : r.review_status === 'confirmed'
        ? 'AI reading confirmed'
        : 'Marked unreadable';
  return [
    {
      stage: 'land',
      title: `Photo taken by ${r.robot_id ?? 'robot'}`,
      detail: [r.site, r.unit_area].filter(Boolean).join(' · '),
      at: r.captured_at,
    },
    {
      stage: 'read',
      title: `AI read ${formatValue(r.ai_value, r.unit)} at ${r.vlm_confidence === null ? '—' : `${Math.round(r.vlm_confidence * 100)}%`} confidence`,
      detail: r.vlm_issues && r.vlm_issues !== 'none' ? `Image issues: ${r.vlm_issues}` : 'No image issues reported',
      at: r.read_at,
    },
    {
      stage: 'refine',
      title: reasons.length ? 'Flagged for a person' : 'Auto-accepted',
      detail: reasons.length
        ? `Because ${reasons.join(' and ')}`
        : `Confident and within the operating limit of ${formatValue(r.normal_max, r.unit)}`,
    },
    { stage: 'serve', title: 'Synced to Lakebase', detail: 'Available in the review app' },
    reviewed
      ? {
          stage: 'review',
          title: decision,
          detail: [r.reviewed_by, r.override_reason].filter(Boolean).join(' — '),
          at: r.reviewed_at,
        }
      : {
          stage: 'review',
          title: reasons.length ? 'Waiting in the review queue' : 'No review needed',
          muted: true,
        },
    reviewed
      ? {
          stage: 'syncback',
          title: 'Decision synced back to Delta',
          detail: 'Folded into gold on the next pipeline run',
        }
      : { stage: 'syncback', title: 'Nothing to sync back yet', muted: true },
    {
      stage: 'ask',
      title: `Trusted value: ${formatValue(r.final_value, r.unit)}`,
      detail:
        r.reading_status === 'high'
          ? 'Unexpectedly high — above the normal operating limit'
          : r.reading_status === 'unreadable'
            ? 'No value: the dial could not be read'
            : 'Within the normal operating limit',
    },
  ];
}

function TraceCard({
  readings,
  threshold,
  onSelectStage,
}: {
  readings: Reading[];
  threshold: number;
  onSelectStage: (id: StageId) => void;
}) {
  const ordered = useMemo(() => {
    const rank = (r: Reading) => (r.is_human_corrected ? 0 : r.needs_review ? 1 : r.reading_status === 'high' ? 2 : 3);
    return [...readings].sort((a, b) => rank(a) - rank(b) || (a.gauge_id ?? '').localeCompare(b.gauge_id ?? ''));
  }, [readings]);
  const [imageId, setImageId] = useState<string | null>(null);
  const r = ordered.find((x) => x.image_id === imageId) ?? ordered[0];
  if (!r) return null;
  const events = traceOf(r, threshold);
  const label = (x: Reading) =>
    `${x.gauge_id ?? x.image_id} · ${
      x.is_human_corrected
        ? 'human-corrected'
        : x.needs_review
          ? 'needs review'
          : x.review_status === 'auto_accepted'
            ? 'auto-accepted'
            : x.review_status.replace('_', ' ')
    }`;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Follow one reading</CardTitle>
        <CardDescription>
          The real journey of one gauge through every step. Click a step to see how it works.
        </CardDescription>
        <div className="flex items-center gap-3 pt-2">
          <img src={imageUrl(r.image_id)} alt="" className="h-12 w-12 rounded border object-cover" />
          <Select value={r.image_id} onValueChange={setImageId}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ordered.map((x) => (
                <SelectItem key={x.image_id} value={x.image_id}>
                  {label(x)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l-2 border-muted ml-3 space-y-4">
          {events.map((e) => {
            const st = STAGES.find((s) => s.id === e.stage);
            return (
              <li key={e.stage} className="pl-5 relative">
                <span
                  className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${
                    e.muted ? 'bg-muted-foreground/40' : 'bg-brand-teal'
                  }`}
                />
                <button type="button" onClick={() => onSelectStage(e.stage)} className="text-left w-full group">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`text-sm font-medium ${e.muted ? 'text-muted-foreground' : 'text-foreground'}`}>
                      <span className="text-xs text-muted-foreground mr-1.5 group-hover:text-brand-teal">
                        {st?.step} {st?.name}
                      </span>
                      {e.title}
                    </span>
                    {e.at && <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>}
                  </div>
                  {e.detail && <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>}
                </button>
              </li>
            );
          })}
        </ol>
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
      decisions: reviewStats?.decisions ?? 0,
      lastReadAt: t?.lastCallAt ?? null,
      lastDecisionAt: reviewStats?.lastDecisionAt ?? null,
    };
  }, [readings.data, usage.days, reviewStats]);

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">How it works</h2>
        <p className="text-sm text-muted-foreground mt-1">
          From robot photo to trusted answer on one governed platform. Click a step to see what happens there and why.
        </p>
      </div>

      <FlowDiagram selected={stage} onSelect={setStage} />

      {readings.error && (
        <Alert variant="destructive">
          <AlertDescription>{readings.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <StageDetail id={stage} live={live} onSelect={setStage} />
        {readings.data ? (
          <TraceCard readings={readings.data.readings} threshold={readings.data.threshold} onSelectStage={setStage} />
        ) : (
          <Skeleton className="h-96" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Live numbers come from the same governed tables the app uses (Lakebase serving copies, the review table and
        Unity AI Gateway usage)
        {live?.lastDecisionAt ? ` · last review decision ${formatDateTime(live.lastDecisionAt)}` : ''}.
      </p>
    </div>
  );
}
