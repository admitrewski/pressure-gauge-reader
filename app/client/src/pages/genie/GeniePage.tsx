import { GenieAssistant } from '../../components/GenieAssistant';

export function GeniePage() {
  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ask about inspection readings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ask in plain English about gauge readings, reviews and unexpectedly high pressures. Click a question to get
          started.
        </p>
      </div>
      <div className="h-[min(680px,72vh)] border rounded-lg overflow-hidden">
        <GenieAssistant />
      </div>
      <p className="text-xs text-muted-foreground">
        AI-generated answers — expand the generated SQL on each answer and verify before acting. Questions run with your
        own Databricks identity, so you only see data you are allowed to see.
      </p>
    </div>
  );
}
