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
  EmptyTitle,
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
} from '@databricks/appkit-ui/react';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReadingDetailDialog } from './ReadingDetailDialog';
import { ConfidenceBadge, ReadingStatusBadge, ReviewStatusBadge } from './StatusBadges';
import { formatDateTime, formatValue, normaliseReading, type Reading, type ReadingsResponse } from './types';

type Filter = 'pending' | 'high' | 'corrected' | 'all';

const FILTERS: Record<Filter, { label: string; test: (r: Reading) => boolean; empty: string }> = {
  pending: { label: 'Needs review', test: (r) => r.needs_review, empty: 'No readings are waiting for review.' },
  high: {
    label: 'High',
    test: (r) => r.reading_status === 'high',
    empty: 'No readings are above their normal maximum.',
  },
  corrected: {
    label: 'Human-corrected',
    test: (r) => r.is_human_corrected,
    empty: 'No readings have been overridden yet.',
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

export function ReviewPage() {
  const [data, setData] = useState<{ readings: Reading[]; lastReadAt: string | null; threshold: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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
  const kpis = useMemo(() => {
    const reviewed = readings.filter((r) => ['confirmed', 'overridden', 'marked_unreadable'].includes(r.review_status));
    const corrected = readings.filter((r) => r.is_human_corrected).length;
    return {
      total: readings.length,
      pending: readings.filter((r) => r.needs_review).length,
      high: readings.filter((r) => r.reading_status === 'high').length,
      autoAccepted: readings.filter((r) => r.review_status === 'auto_accepted').length,
      reviewed: reviewed.length,
      correctionRate: reviewed.length ? `${Math.round((corrected / reviewed.length) * 100)}%` : '—',
      corrected,
    };
  }, [readings]);

  const visible = readings.filter(FILTERS[filter].test);
  const selected = readings.find((r) => r.image_id === selectedId) ?? null;
  const freshness = data?.lastReadAt
    ? `AI readings as of ${formatDateTime(data.lastReadAt)} · source: gold_gauge_readings_final (Lakebase)`
    : 'Source: gold_gauge_readings_final (Lakebase)';

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gauge reading review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {kpis.pending > 0
              ? `${kpis.pending} reading${kpis.pending === 1 ? '' : 's'} from the latest inspection rounds need a human check.`
              : 'All readings from the latest inspection rounds are accepted or reviewed.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load readings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {savedMessage && (
        <Alert>
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
              detail={`Low confidence (<${Math.round((data?.threshold ?? 0.7) * 100)}%), unreadable or high`}
            />
            <KpiCard
              title="Above normal maximum"
              value={String(kpis.high)}
              detail="Excursions against the gauge's operating limit"
            />
            <KpiCard
              title="Human correction rate"
              value={kpis.correctionRate}
              detail={`${kpis.corrected} overridden of ${kpis.reviewed} reviewed`}
            />
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-3">{freshness}</p>

      <Card>
        <CardHeader className="pb-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              {(Object.keys(FILTERS) as Filter[]).map((f) => (
                <TabsTrigger key={f} value={f}>
                  {FILTERS[f].label} ({readings.filter(FILTERS[f].test).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-2">
              {['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nothing here</EmptyTitle>
                <EmptyDescription>{FILTERS[filter].empty}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gauge</TableHead>
                  <TableHead>Site · area</TableHead>
                  <TableHead>Captured</TableHead>
                  <TableHead className="text-right">Reading</TableHead>
                  <TableHead className="text-right">Normal max</TableHead>
                  <TableHead>AI confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.image_id} className="cursor-pointer" onClick={() => setSelectedId(r.image_id)}>
                    <TableCell className="font-medium">{r.gauge_id ?? r.image_id}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[r.site, r.unit_area].filter(Boolean).join(' · ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.captured_at)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatValue(r.final_value, r.unit)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatValue(r.normal_max, r.unit)}
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge value={r.vlm_confidence} threshold={data?.threshold ?? 0.7} />
                    </TableCell>
                    <TableCell>
                      <ReadingStatusBadge status={r.reading_status} />
                    </TableCell>
                    <TableCell>
                      <ReviewStatusBadge status={r.review_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <ReadingDetailDialog
          key={selected.image_id}
          reading={selected}
          threshold={data?.threshold ?? 0.7}
          onClose={() => setSelectedId(null)}
          onSaved={() => {
            setSavedMessage(
              `Review saved for ${selected?.gauge_id ?? selected?.image_id}. It reaches the lakehouse via Lakehouse Sync.`
            );
            setSelectedId(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
