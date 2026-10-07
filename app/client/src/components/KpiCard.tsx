import { Card, CardContent } from '@databricks/appkit-ui/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type KpiTone = 'brand' | 'warning' | 'destructive' | 'success' | 'neutral';

const TONE: Record<KpiTone, { bar: string; chip: string }> = {
  brand: { bar: 'bg-brand-teal', chip: 'bg-brand-teal-soft text-brand-teal' },
  warning: { bar: 'bg-warning', chip: 'bg-warning/15 text-warning' },
  destructive: { bar: 'bg-destructive', chip: 'bg-destructive/10 text-destructive' },
  success: { bar: 'bg-success', chip: 'bg-success/15 text-success' },
  neutral: { bar: 'bg-muted-foreground/40', chip: 'bg-muted text-muted-foreground' },
};

interface Props {
  icon: LucideIcon;
  tone: KpiTone;
  title: string;
  value: string;
  detail: ReactNode;
  footer?: ReactNode;
}

/** One headline number: what it is, the value, and the one line that explains it. */
export function KpiCard({ icon: Icon, tone, title, value, detail, footer }: Props) {
  const t = TONE[tone];
  return (
    <Card className="relative overflow-hidden h-full">
      <div className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
      <CardContent className="pt-5 pb-4 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${t.chip}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <div className="text-3xl font-semibold tabular-nums text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground leading-snug">{detail}</p>
        {footer && <div className="mt-auto pt-1 text-xs">{footer}</div>}
      </CardContent>
    </Card>
  );
}
