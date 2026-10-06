import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Kbd,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { CheckCircle2, MessageSquareText, MousePointerClick, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GenieAssistant } from '../../components/GenieAssistant';
import { ReadingDetailPane } from './ReadingDetailPane';
import { ConfidenceBadge, ReadingStatusBadge, ReviewStatusBadge } from './StatusBadges';
import { formatDateTime, formatValue, imageUrl, normaliseReading, type Reading, type ReadingsResponse } from './types';

type Filter = 'pending' | 'high' | 'corrected' | 'auto' | 'all';

const FILTERS: Record<Filter, { label: string; test: (r: Reading) => boolean; empty: string }> = {
  pending: {
    label: 'Needs review',
    test: (r) => r.needs_review,
    empty: 'Every reading from the latest rounds is accepted or reviewed.',
  },
  high: {
    label: 'Unexpectedly high',
    test: (r) => r.reading_status === 'high',
    empty: 'No unexpectedly high readings: every gauge is within its normal operating limit.',
  },
  corrected: {
    label: 'Human-corrected',
    test: (r) => r.is_human_corrected,
    empty: 'No readings have been overridden yet.',
  },
  auto: {
    label: 'Auto-accepted',
    test: (r) => r.review_status === 'auto_accepted',
    empty: 'No readings were accepted automatically — every reading needed a human check.',
  },
  all: {
    label: 'All readings',
    test: () => true,
    empty: 'No readings yet — the pipeline has not processed any images.',
  },
};

function KpiCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

const SEGMENTS: { key: Reading['review_status']; label: string; className: string }[] = [
  { key: 'auto_accepted', label: 'Auto-accepted', className: 'bg-success/50' },
  { key: 'confirmed', label: 'Confirmed', className: 'bg-success' },
  { key: 'overridden', label: 'Overridden', className: 'bg-primary' },
  { key: 'marked_unreadable', label: 'Marked unreadable', className: 'bg-muted-foreground' },
  { key: 'pending_review', label: 'Needs review', className: 'bg-warning' },
];

/** Where every reading from the round stands, as one stacked bar. */
function StatusBar({ readings }: { readings: Reading[] }) {
  const total = readings.length || 1;
  const counts = SEGMENTS.map((s) => ({ ...s, n: readings.filter((r) => r.review_status === s.key).length }));
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <div
              key={c.key}
              className={c.className}
              style={{ width: `${(c.n / total) * 100}%` }}
              title={`${c.label}: ${c.n}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {counts.map((c) => (
          <span key={c.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${c.className}`} /> {c.label} {c.n}
          </span>
        ))}
      </div>
    </div>
  );
}

function GenieSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Ask about these readings</SheetTitle>
          <SheetDescription>
            Answers come from the governed inspection data, with your own permissions. Expand the SQL on each answer to
            verify it.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden mx-4 mb-4">
          <GenieAssistant persistInUrl={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ReviewPage() {
  const isMobile = useIsMobile();
  const [data, setData] = useState<{ readings: Reading[]; lastReadAt: string | null; threshold: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [genieOpen, setGenieOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/readings');
      if (!res.ok) throw new Error(`Failed to load readings (${res.status})`);
      const body = (await res.json()) as ReadingsResponse;
      setData({
        readings: body.readings.map(normaliseReading),
        lastReadAt: body.lastReadAt,
        threshold: body.reviewConfidenceThreshold,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load readings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const readings = useMemo(() => data?.readings ?? [], [data]);
  const threshold = data?.threshold ?? 0.7;
  const visible = useMemo(() => readings.filter(FILTERS[filter].test), [readings, filter]);
  // Selection falls back to the first visible reading, so the pane is never empty while there is work.
  const selected = visible.find((r) => r.image_id === selectedId) ?? visible[0] ?? null;

  const kpis = useMemo(() => {
    const reviewed = readings.filter((r) => ['confirmed', 'overridden', 'marked_unreadable'].includes(r.review_status));
    const corrected = readings.filter((r) => r.is_human_corrected).length;
    return {
      total: readings.length,
      pending: readings.filter((r) => r.needs_review).length,
      high: readings.filter((r) => r.reading_status === 'high').length,
      autoAccepted: readings.filter((r) => r.review_status === 'auto_accepted').length,
      reviewed: reviewed.length,
      corrected,
      correctionRate: reviewed.length ? `${Math.round((corrected / reviewed.length) * 100)}%` : '—',
    };
  }, [readings]);

  // ↑/↓ (or K/J) to move through the queue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (genieOpen || (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))) return;
      const idx = selected ? visible.findIndex((r) => r.image_id === selected.image_id) : -1;
      if ((e.key === 'ArrowDown' || e.key === 'j') && idx < visible.length - 1) {
        e.preventDefault();
        setSelectedId(visible[idx + 1].image_id);
      } else if ((e.key === 'ArrowUp' || e.key === 'k') && idx > 0) {
        e.preventDefault();
        setSelectedId(visible[idx - 1].image_id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selected, genieOpen]);

  const onSaved = (action: string) => {
    if (!selected) return;
    // Auto-advance to the next reading in the current view.
    const idx = visible.findIndex((r) => r.image_id === selected.image_id);
    const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
    setSelectedId(next?.image_id ?? null);
    const verb =
      action === 'override' ? 'Override saved' : action === 'confirm' ? 'AI reading confirmed' : 'Marked unreadable';
    setSavedMessage(`${verb} for ${selected.gauge_id ?? selected.image_id}.`);
    void load();
  };

  const queue = (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex-wrap h-auto">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {FILTERS[f].label} ({readings.filter(FILTERS[f].test).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {loading && !data ? (
          <div className="space-y-2">
            {['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyTitle>{filter === 'pending' ? 'Review queue is clear' : 'Nothing here'}</EmptyTitle>
              <EmptyDescription>{FILTERS[filter].empty}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Gauge</TableHead>
                <TableHead className="text-right">Reading</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const active = selected?.image_id === r.image_id;
                return (
                  <TableRow
                    key={r.image_id}
                    data-state={active ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(r.image_id)}
                  >
                    <TableCell className="py-1.5">
                      <img
                        src={imageUrl(r.image_id)}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 rounded object-cover border"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.gauge_id ?? r.image_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.unit_area} · {formatDateTime(r.captured_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatValue(r.final_value, r.unit)}</TableCell>
                    <TableCell>
                      <ConfidenceBadge value={r.vlm_confidence} threshold={threshold} />
                    </TableCell>
                    <TableCell>
                      <ReadingStatusBadge status={r.reading_status} />
                    </TableCell>
                    <TableCell>
                      <ReviewStatusBadge status={r.review_status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <div className="px-6 pb-4 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>C</Kbd> confirm
        </span>
        <span>
          <Kbd>O</Kbd> override
        </span>
        <span>
          <Kbd>U</Kbd> unreadable
        </span>
      </div>
    </Card>
  );

  const detail = selected ? (
    <ReadingDetailPane key={selected.image_id} reading={selected} threshold={threshold} onSaved={onSaved} />
  ) : (
    <Card className="h-full">
      <CardContent className="h-full flex items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MousePointerClick />
            </EmptyMedia>
            <EmptyTitle>Select a reading</EmptyTitle>
            <EmptyDescription>Pick a gauge from the queue to see the photo and the AI reading.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gauge reading review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {kpis.pending > 0
              ? `${kpis.pending} reading${kpis.pending === 1 ? '' : 's'} from the latest inspection rounds need a human check.`
              : 'All readings from the latest inspection rounds are accepted or reviewed.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setGenieOpen(true)}>
            <MessageSquareText className="h-4 w-4 mr-2" /> Ask Genie
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load readings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {savedMessage && (
        <Alert className="border-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{savedMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading && !data ? (
          ['k1', 'k2', 'k3', 'k4'].map((k) => <Skeleton key={k} className="h-28" />)
        ) : (
          <>
            <KpiCard
              title="Gauge readings"
              value={String(kpis.total)}
              detail={`${kpis.autoAccepted} auto-accepted by the AI`}
            />
            <KpiCard
              title="Needs review"
              value={String(kpis.pending)}
              detail={`Confidence below ${Math.round(threshold * 100)}%, unreadable or unexpectedly high`}
            />
            <KpiCard
              title="Unexpectedly high readings"
              value={String(kpis.high)}
              detail="Above the gauge's normal operating limit"
            />
            <KpiCard
              title="Human correction rate"
              value={kpis.correctionRate}
              detail={`${kpis.corrected} overridden of ${kpis.reviewed} reviewed`}
            />
          </>
        )}
      </div>
      {data && <StatusBar readings={readings} />}
      <p className="text-xs text-muted-foreground">
        {data?.lastReadAt ? `AI readings as of ${formatDateTime(data.lastReadAt)}` : ''}
      </p>

      {isMobile ? (
        <div className="space-y-4">
          {detail}
          {queue}
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="min-h-[640px] rounded-lg">
          <ResizablePanel defaultSize={56} minSize={35}>
            <div className="h-full pr-2">{queue}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={44} minSize={30}>
            <div className="h-full pl-2">{detail}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <GenieSheet open={genieOpen} onOpenChange={setGenieOpen} />
    </div>
  );
}
