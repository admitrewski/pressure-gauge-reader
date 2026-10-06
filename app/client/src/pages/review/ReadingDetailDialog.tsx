import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
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
import { useState } from 'react';
import { ConfidenceBadge, ReadingStatusBadge, ReviewStatusBadge } from './StatusBadges';
import { formatDateTime, formatValue, type Reading, type ReviewAction } from './types';

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
  onClose: () => void;
  onSaved: () => void;
}

export function ReadingDetailDialog({ reading, threshold, onClose, onSaved }: Props) {
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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const imageSrc = `/api/files/files/raw?path=${encodeURIComponent(`images/${reading.image_id}`)}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {reading.gauge_id ?? reading.image_id}
            <ReadingStatusBadge status={reading.reading_status} />
            <ReviewStatusBadge status={reading.review_status} />
          </DialogTitle>
          <DialogDescription>
            {[reading.site, reading.unit_area].filter(Boolean).join(' · ')} — captured{' '}
            {formatDateTime(reading.captured_at)} by {reading.robot_id ?? 'unknown robot'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            {!imageLoaded && !imageFailed && <Skeleton className="w-full aspect-square" />}
            {imageFailed ? (
              <Alert variant="destructive">
                <AlertDescription>Could not load the image from the volume.</AlertDescription>
              </Alert>
            ) : (
              <img
                src={imageSrc}
                alt={`Gauge image ${reading.image_id}`}
                className={`w-full rounded-md border object-contain max-h-[480px] ${imageLoaded ? '' : 'hidden'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
              />
            )}
            <p className="text-xs text-muted-foreground">{reading.image_id}</p>
          </div>

          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Trusted reading</dt>
              <dd className="font-semibold text-base">{formatValue(reading.final_value, reading.unit)}</dd>
              <dt className="text-muted-foreground">AI reading</dt>
              <dd>{formatValue(reading.ai_value, reading.unit)}</dd>
              <dt className="text-muted-foreground">AI confidence</dt>
              <dd>
                <ConfidenceBadge value={reading.vlm_confidence} threshold={threshold} />
              </dd>
              <dt className="text-muted-foreground">Dial range</dt>
              <dd>
                {formatValue(reading.scale_min, null)} – {formatValue(reading.scale_max, reading.unit)}
                {reading.unit_label && reading.unit_label !== reading.unit ? ` (printed: ${reading.unit_label})` : ''}
              </dd>
              <dt className="text-muted-foreground">Normal maximum</dt>
              <dd>{formatValue(reading.normal_max, reading.unit)}</dd>
              <dt className="text-muted-foreground">Image issues</dt>
              <dd>{reading.vlm_issues && reading.vlm_issues !== 'none' ? reading.vlm_issues : 'None reported'}</dd>
              <dt className="text-muted-foreground">Model notes</dt>
              <dd>{reading.vlm_notes ?? '—'}</dd>
              {reading.reviewed_by && (
                <>
                  <dt className="text-muted-foreground">Last review</dt>
                  <dd>
                    {reading.reviewed_by}, {formatDateTime(reading.reviewed_at)}
                    {reading.override_reason ? ` — ${reading.override_reason}` : ''}
                  </dd>
                </>
              )}
            </dl>
            <p className="text-xs text-muted-foreground">
              Read by {reading.model_name ?? 'the vision model'} on {formatDateTime(reading.read_at)}. AI readings can
              be wrong — check the image before accepting.
            </p>

            <Separator />

            {mode === 'override' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="override-value">Corrected reading ({reading.unit ?? 'unit'})</Label>
                  <Input
                    id="override-value"
                    type="number"
                    step="any"
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
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="review-note">Note (optional)</Label>
                <Textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === 'override' ? (
            <>
              <Button variant="ghost" onClick={() => setMode('view')} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit('override')} disabled={saving}>
                {saving ? 'Saving…' : 'Save override'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => void submit('unreadable')} disabled={saving}>
                Mark unreadable
              </Button>
              <Button variant="outline" onClick={() => setMode('override')} disabled={saving}>
                Override reading
              </Button>
              <Button onClick={() => void submit('confirm')} disabled={saving || reading.ai_value === null}>
                {saving ? 'Saving…' : 'Confirm AI reading'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
