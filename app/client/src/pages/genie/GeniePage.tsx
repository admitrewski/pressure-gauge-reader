import { GenieChat } from '@databricks/appkit-ui/react';

const SUGGESTIONS = [
  'Which image readings have needed human intervention?',
  'Are any pressure readings unusually high?',
  'How many readings are still waiting for review?',
  'Which dials could not be read, and why?',
];

export function GeniePage() {
  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ask about inspection readings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Natural-language questions over the governed gold table <code>gold_gauge_readings_final</code>, answered by
          the “Gauge Inspection Readings” Genie Agent.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Try:{' '}
          {SUGGESTIONS.map((s, i) => (
            <span key={s}>
              “{s}”{i < SUGGESTIONS.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </div>
      <div className="h-[min(640px,70vh)] border rounded-lg overflow-hidden">
        <GenieChat alias="default" placeholder="e.g. Which image readings have needed human intervention?" />
      </div>
      <p className="text-xs text-muted-foreground">
        AI-generated from your data via Genie — expand the generated SQL on each answer and verify before acting.
        Queries run with your own Databricks identity, so you only see data your Unity Catalog permissions allow.
      </p>
    </div>
  );
}
