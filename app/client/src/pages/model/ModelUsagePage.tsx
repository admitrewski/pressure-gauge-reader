import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@databricks/appkit-ui/react';
import { AlertTriangle, BrainCircuit, Coins, Lightbulb, ReceiptText, ShieldCheck } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { KpiCard } from '../../components/KpiCard';
import { formatDateTime } from '../review/types';
import { formatTokens, formatUsd, totalsOf, useModelUsage } from './usage';
import { useReadings } from './useReadings';

const ISSUE_LABEL: Record<string, string> = {
  glare: 'Glare',
  dirty: 'Dirty dial',
  blur: 'Blur',
  angled: 'Steep angle',
  low_light: 'Low light',
  small_in_frame: 'Small in frame',
  multiple_gauges: 'Several gauges',
  occluded: 'Partly hidden',
};

function ModelCard({ threshold }: { threshold: number }) {
  const rows: [string, ReactNode][] = [
    ['Model', 'OpenAI GPT-5.5 (vision), pay-per-token'],
    [
      'Served through',
      <>
        Unity AI Gateway as <code className="text-xs">system.ai.gpt-5-5</code>
      </>,
    ],
    [
      'Called from',
      'The Lakeflow pipeline (ai_query in a streaming table), once per new photo — never re-read on refresh',
    ],
    ['Returns', 'Reading, unit, dial scale, confidence (0–1), readable flag and image issues'],
    [
      'Human review when',
      `Confidence below ${Math.round(threshold * 100)}%, the dial is unreadable, or the reading is above the gauge's normal operating limit`,
    ],
    ['Access', 'Unity Catalog EXECUTE on system.ai; every call logged with requester, tokens and status'],
    [
      'Why this model',
      'Best accuracy of 15 vision models tested, with a confidence score that separates right from wrong readings',
    ],
  ];
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-brand-teal" /> Model card
        </CardTitle>
        <CardDescription>A foundation vision model — no training data or custom model to maintain.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9.5rem_1fr] gap-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function QualityCard({ readings }: { readings: ReturnType<typeof useReadings> }) {
  const { data, error } = readings;
  const q = useMemo(() => {
    if (!data) return null;
    const { readings, threshold } = data;
    const bins = Array.from({ length: 10 }, (_, i) => ({ lo: i / 10, n: 0 }));
    for (const r of readings) {
      if (r.vlm_confidence === null) continue;
      bins[Math.min(9, Math.floor(r.vlm_confidence * 10))].n += 1;
    }
    const reviewed = readings.filter((r) => ['confirmed', 'overridden', 'marked_unreadable'].includes(r.review_status));
    const corrected = readings.filter((r) => r.is_human_corrected).length;
    const issues = new Map<string, number>();
    for (const r of readings)
      for (const i of (r.vlm_issues ?? '').split(',').map((s) => s.trim()))
        if (i && i !== 'none') issues.set(i, (issues.get(i) ?? 0) + 1);
    return {
      threshold,
      bins,
      max: Math.max(1, ...bins.map((b) => b.n)),
      total: readings.length,
      auto: readings.filter((r) => r.review_status === 'auto_accepted').length,
      reviewed: reviewed.length,
      corrected,
      issues: [...issues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-teal" /> Reading quality
        </CardTitle>
        <CardDescription>
          How confident the model is, and how often people disagree with it — the live accuracy check.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !q ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                AI confidence per reading — below the {Math.round(q.threshold * 100)}% line goes to a person
              </div>
              <div className="relative flex items-end gap-1 h-28 border-b">
                {q.bins.map((b) => (
                  <div key={b.lo} className="flex-1 flex flex-col items-center justify-end h-full">
                    {b.n > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{b.n}</span>}
                    <div
                      className={`w-full rounded-t ${b.lo < q.threshold - 1e-9 ? 'bg-warning' : 'bg-brand-teal'}`}
                      style={{ height: `${(b.n / q.max) * 85}%` }}
                      title={`${Math.round(b.lo * 100)}–${Math.round(b.lo * 100 + 10)}%: ${b.n}`}
                    />
                  </div>
                ))}
                <div
                  className="absolute inset-y-0 border-l-2 border-dashed border-foreground/60"
                  style={{ left: `${q.threshold * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-2xl font-semibold tabular-nums">
                  {q.total ? Math.round((q.auto / q.total) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">
                  accepted without a person ({q.auto} of {q.total})
                </div>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-2xl font-semibold tabular-nums">
                  {q.reviewed ? `${Math.round((q.corrected / q.reviewed) * 100)}%` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  human correction rate ({q.corrected} overridden of {q.reviewed} reviewed)
                </div>
              </div>
            </div>
            {q.issues.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Most common image issues the model reported</div>
                <div className="flex flex-wrap gap-2">
                  {q.issues.map(([k, n]) => (
                    <Badge key={k} variant="secondary">
                      {ISSUE_LABEL[k] ?? k} · {n}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ModelUsagePage() {
  const { days, error } = useModelUsage();
  const readings = useReadings();
  const t = useMemo(() => (days ? totalsOf(days) : null), [days]);
  const extraCalls = t ? Math.max(0, t.requests - t.images) : 0;
  const reasoningShare = t && t.outputTokens ? t.reasoningTokens / t.outputTokens : 0;

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI model & usage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Which model reads the gauges, what it costs per reading, and how far its readings can be trusted.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load model usage</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {!t ? (
          ['u1', 'u2', 'u3', 'u4'].map((k) => <Skeleton key={k} className="h-36" />)
        ) : (
          <>
            <KpiCard
              icon={Coins}
              tone="brand"
              title="AI cost per gauge reading"
              value={formatUsd(t.costPerImage, 3)}
              detail="Tokens × published GPT-5.5 rates at list price"
            />
            <KpiCard
              icon={ReceiptText}
              tone="neutral"
              title="AI spend, latest rounds"
              value={formatUsd(t.cost)}
              detail={`${t.requests} model calls for ${t.images} photos${extraCalls ? ` (incl. ${extraCalls} test calls)` : ''}`}
            />
            <KpiCard
              icon={BrainCircuit}
              tone="neutral"
              title="Tokens per reading"
              value={t.images ? formatTokens(t.inputTokens / t.images + t.outputTokens / t.images) : '—'}
              detail={
                t.images
                  ? `${formatTokens(t.inputTokens / t.images)} in (photo + prompt) · ${formatTokens(t.outputTokens / t.images)} out`
                  : 'No readings yet'
              }
            />
            <KpiCard
              icon={AlertTriangle}
              tone={t.errors ? 'destructive' : 'success'}
              title="Failed model calls"
              value={`${t.errors} of ${t.requests}`}
              detail="Failures land in a quarantine table instead of stopping the pipeline"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModelCard threshold={readings.data?.threshold ?? 0.7} />
        <QualityCard readings={readings} />
      </div>

      {t && t.cost > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-brand-teal" /> Where the cost goes
            </CardTitle>
            <CardDescription>
              Output tokens cost 6× input tokens, and most of them are the model reasoning about the dial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-brand-navy" style={{ width: `${(t.inputCost / t.cost) * 100}%` }} />
              <div className="bg-brand-teal" style={{ width: `${(t.outputCost / t.cost) * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-navy" /> Input (photo + prompt){' '}
                {formatUsd(t.inputCost)} · {Math.round((t.inputCost / t.cost) * 100)}%
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-teal" /> Output{' '}
                {formatUsd(t.outputCost)} · {Math.round((t.outputCost / t.cost) * 100)}% —{' '}
                {Math.round(reasoningShare * 100)}% of output tokens are reasoning
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Biggest cost lever: a lower reasoning effort, or a smaller model for clear photos. Test any change against
              the human correction rate before switching — Unity AI Gateway lets the model change without touching the
              pipeline.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage by day</CardTitle>
          <CardDescription>
            Every vision-model call made by the pipeline, as recorded by Unity AI Gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!days ? (
            <Skeleton className="h-20 w-full" />
          ) : days.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No model calls yet</EmptyTitle>
                <EmptyDescription>Usage appears after the pipeline reads its first photos.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Photos read</TableHead>
                  <TableHead className="text-right">Model calls</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Input tokens</TableHead>
                  <TableHead className="text-right">Output tokens</TableHead>
                  <TableHead className="text-right">Avg latency</TableHead>
                  <TableHead className="text-right">Est. cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={`${d.usage_date}-${d.model_service}`}>
                    <TableCell>{d.usage_date}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.images_read ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.requests}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.errors}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.input_tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.output_tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {d.avg_latency_ms === null ? 'not logged' : `${(d.avg_latency_ms / 1000).toFixed(1)} s`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatUsd(d.est_cost_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Source: Unity AI Gateway usage (system.ai_gateway.usage) → gold_vlm_usage_daily → Lakebase
        {t?.lastCallAt ? ` · last model call ${formatDateTime(t.lastCallAt)}` : ''}. Cost is a list-price estimate
        (GPT-5.5: 71.4 DBU per 1M input and 428.6 DBU per 1M output tokens
        {t && days?.[0]?.usd_per_dbu ? ` × $${days[0].usd_per_dbu.toFixed(2)}/DBU` : ''}), not an invoice. Latency is
        not logged for batch ai_query calls.
      </p>
    </div>
  );
}
