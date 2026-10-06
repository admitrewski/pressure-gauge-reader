import { Badge } from '@databricks/appkit-ui/react';
import type { ReadingStatus, ReviewStatus } from './types';

const READING_LABEL: Record<ReadingStatus, string> = {
  normal: 'Normal',
  high: 'Unexpectedly high',
  unreadable: 'Unreadable',
};

export function ReadingStatusBadge({ status }: { status: ReadingStatus }) {
  if (status === 'high')
    return <Badge className="bg-destructive text-destructive-foreground">{READING_LABEL.high}</Badge>;
  if (status === 'unreadable') return <Badge variant="outline">{READING_LABEL.unreadable}</Badge>;
  return <Badge variant="secondary">{READING_LABEL.normal}</Badge>;
}

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  auto_accepted: 'Auto-accepted',
  pending_review: 'Needs review',
  confirmed: 'Confirmed',
  overridden: 'Overridden',
  marked_unreadable: 'Marked unreadable',
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  if (status === 'pending_review')
    return <Badge className="bg-warning text-warning-foreground">{REVIEW_LABEL[status]}</Badge>;
  if (status === 'overridden')
    return <Badge className="bg-primary text-primary-foreground">{REVIEW_LABEL[status]}</Badge>;
  if (status === 'confirmed')
    return <Badge className="bg-success text-success-foreground">{REVIEW_LABEL[status]}</Badge>;
  return <Badge variant="outline">{REVIEW_LABEL[status]}</Badge>;
}

export function ConfidenceBadge({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <Badge variant="outline">—</Badge>;
  const pct = `${Math.round(value * 100)}%`;
  return value < threshold ? (
    <Badge
      className="bg-warning text-warning-foreground"
      title={`Below the ${Math.round(threshold * 100)}% review threshold`}
    >
      {pct}
    </Badge>
  ) : (
    <Badge variant="secondary">{pct}</Badge>
  );
}
