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
  Input,
  Kbd,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Textarea,
} from '@databricks/appkit-ui/react';
import { CameraOff, CheckCircle2, PencilLine, ScanEye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReadingStatusBadge, ReviewStatusBadge } from './StatusBadges';
import { formatDateTime, formatValue, imageUrl, type Reading, type ReviewAction } from './types';

const OVERRIDE_REASONS = [
  'Misread needle position',
  'Read the wrong scale',
  'Read the wrong gauge',
  'Glare or dirt hid the needle',
  'Other',
];

interface Props {
  reading: Reading;
  threshold: number;
  onSaved: (action: ReviewAction) => void;
}

/** Confidence as a bar with the review threshold marked, so "why is this in review?" is visible at a glance. */
function ConfidenceBar({ value, threshold }: { value: number | null; threshold: number }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const below = value !== null && value < threshold;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">AI confidence</span>
        <span className="tabular-nums font-medium">{value === null ? '—' : `${pct}%`}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted" aria-label={`AI confidence ${pct}%`}>
        <div className={`h-2 rounded-full ${below ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
        <div
          className="absolute -top-1 h-4 w-0.5 bg-foreground"
          style={{ left: `${Math.round(threshold * 100)}%` }}
          title={`Review threshold ${Math.round(threshold * 100)}%`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {below ? 'Below' : 'Above'} the {Math.round(threshold * 100)}% review threshold
      </p>
    </div>
  );
}

/** Outcome banner once a human has decided. */
function DecisionBanner({ reading }: { reading: Reading }) {
  if (!['confirmed', 'overridden', 'marked_unreadable'].includes(reading.review_status)) return null;
  const by = `${reading.reviewed_by ?? 'Reviewer'}, ${formatDateTime(reading.reviewed_at)}`;
  if (reading.review_status === 'overridden') {
    return (
      <Alert className="border-primary">
        <PencilLine className="h-4 w-4" />
        <AlertTitle>
          Overridden: {formatValue(reading.ai_value, reading.unit)} → {formatValue(reading.final_value, reading.unit)}
        </AlertTitle>
        <AlertDescription>
          {by}
          {reading.override_reason ? ` — ${reading.override_reason}` : ''}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className={reading.review_status === 'confirmed' ? 'border-success' : ''}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>{reading.review_status === 'confirmed' ? 'AI reading confirmed' : 'Marked unreadable'}</AlertTitle>
      <AlertDescription>
        {by}
        {reading.override_reason ? ` — ${reading.override_reason}` : ''}
      </AlertDescription>
    </Alert>
  );
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable ||
      el.getAttribute('role') === 'combobox')
  );
}

export function ReadingDetailPane({ reading, threshold, onSaved }: Props) {
  const [mode, setMode] = useState<'view' | 'override'>('view');
  const [value, setValue] = useState(reading.ai_value !== null ? String(reading.ai_value) : '');
  const [reason, setReason] = useState(OVERRIDE_REASONS[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const submit = async (action: ReviewAction) => {
    setError(null);
    const body: { action: ReviewAction; humanValue?: number; reason?: string } = { action };
    if (action === 'override') {
      const n = Number(value);
      if (value.trim() === '' || !Number.isFinite(n)) {
        setError('Enter the corrected reading as a number.');
        return;
      }
      body.humanValue = n;
      body.reason = [reason, note.trim()].filter(Boolean).join(': ');
    } else if (note.trim()) {
      body.reason = note.trim();
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/readings/${encodeURIComponent(reading.image_id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Save failed (${res.status})`);
      }
      onSaved(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts for fast review: C confirm, O override, U unreadable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (saving || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || mode === 'override') return;
      const k = e.key.toLowerCase();
      if (k === 'c' && reading.ai_value !== null) {
        e.preventDefault();
        void submit('confirm');
      } else if (k === 'o') {
        e.preventDefault();
        setMode('override');
      } else if (k === 'u') {
        e.preventDefault();
        void submit('unreadable');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          {reading.gauge_id ?? reading.image_id}
          <ReadingStatusBadge status={reading.reading_status} />
          <ReviewStatusBadge status={reading.review_status} />
        </CardTitle>
        <CardDescription>
          {[reading.site, reading.unit_area].filter(Boolean).join(' · ')} — captured{' '}
          {formatDateTime(reading.captured_at)} by {reading.robot_id ?? 'unknown robot'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DecisionBanner reading={reading} />

        <div className="rounded-md border bg-muted/40">
          {!imageLoaded && !imageFailed && <Skeleton className="w-full aspect-[4/3]" />}
          {imageFailed ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CameraOff />
                </EmptyMedia>
                <EmptyTitle>Image unavailable</EmptyTitle>
                <EmptyDescription>The photo could not be loaded from the inspection volume.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <img
              src={imageUrl(reading.image_id)}
              alt={`Gauge ${reading.gauge_id ?? reading.image_id}`}
              className={`w-full rounded-md object-contain max-h-[360px] ${imageLoaded ? '' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Trusted reading</p>
            <p className="text-2xl font-semibold tabular-nums">{formatValue(reading.final_value, reading.unit)}</p>
            <p className="text-xs text-muted-foreground">Normal max {formatValue(reading.normal_max, reading.unit)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ScanEye className="h-3 w-3" /> AI reading
            </p>
            <p className="text-2xl font-semibold tabular-nums">{formatValue(reading.ai_value, reading.unit)}</p>
            <p className="text-xs text-muted-foreground">
              {reading.scale_max === null
                ? 'Dial range not readable'
                : `Dial ${formatValue(reading.scale_min, null)}–${formatValue(reading.scale_max, reading.unit)}`}
              {reading.unit_label && reading.unit_label !== reading.unit ? ` (printed “${reading.unit_label}”)` : ''}
            </p>
          </div>
        </div>

        <ConfidenceBar value={reading.vlm_confidence} threshold={threshold} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Image issues</dt>
          <dd>{reading.vlm_issues && reading.vlm_issues !== 'none' ? reading.vlm_issues : 'None reported'}</dd>
          <dt className="text-muted-foreground">Model notes</dt>
          <dd>{reading.vlm_notes ?? '—'}</dd>
          <dt className="text-muted-foreground">Read by</dt>
          <dd>
            {reading.model_name ?? 'vision model'} · {formatDateTime(reading.read_at)}
          </dd>
        </dl>
        <p className="text-xs text-muted-foreground">AI readings can be wrong — check the photo before accepting.</p>

        <Separator />

        {mode === 'override' ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="override-value">Corrected reading ({reading.unit ?? 'unit'})</Label>
              <Input
                id="override-value"
                type="number"
                step="any"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERRIDE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="override-note">Note (optional)</Label>
              <Textarea id="override-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('view')} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit('override')} disabled={saving}>
                {saving ? 'Saving…' : 'Save override'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="review-note">Note (optional)</Label>
              <Textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => void submit('unreadable')} disabled={saving}>
                Mark unreadable <Kbd className="ml-2">U</Kbd>
              </Button>
              <Button variant="outline" onClick={() => setMode('override')} disabled={saving}>
                Override <Kbd className="ml-2">O</Kbd>
              </Button>
              <Button onClick={() => void submit('confirm')} disabled={saving || reading.ai_value === null}>
                {saving ? 'Saving…' : 'Confirm AI reading'} <Kbd className="ml-2">C</Kbd>
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
