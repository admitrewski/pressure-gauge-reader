import { Button, GenieChatInput, GenieChatMessageList, useGenieChat } from '@databricks/appkit-ui/react';
import { MessageSquareText, RotateCcw } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  'Which image readings have needed human intervention?',
  'Are any pressure readings unexpectedly high?',
  'How many readings are still waiting for review?',
  'Which dials could not be read, and why?',
  'Which site has the most unexpectedly high readings?',
];

interface Props {
  /** Keep the conversation id in the URL (page) or not (side panel). */
  persistInUrl?: boolean;
  questions?: string[];
}

/**
 * Genie chat with clickable example questions. Built from the AppKit Genie primitives so a question chip
 * can send a message directly (the packaged GenieChat has no programmatic send).
 */
export function GenieAssistant({ persistInUrl = true, questions = EXAMPLE_QUESTIONS }: Props) {
  const { messages, status, error, sendMessage, reset, hasPreviousPage, fetchPreviousPage } = useGenieChat({
    alias: 'default',
    persistInUrl,
  });
  const busy = status === 'streaming' || status === 'loading-history';
  const empty = messages.length === 0 && status !== 'loading-history';

  const chips = (compact: boolean) => (
    <div className={compact ? 'flex gap-2 overflow-x-auto pb-1' : 'flex flex-wrap justify-center gap-2'}>
      {questions.map((q) => (
        <Button
          key={q}
          variant="outline"
          size="sm"
          className={compact ? 'shrink-0 text-xs h-7' : 'h-auto whitespace-normal text-left py-1.5'}
          disabled={busy}
          onClick={() => sendMessage(q)}
        >
          {q}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!empty && (
        <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-xs text-muted-foreground">
            {status === 'streaming'
              ? 'Genie is analysing your data…'
              : 'AI-generated — expand the SQL to verify each answer'}
          </span>
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground" disabled={busy}>
            <RotateCcw className="h-3 w-3 mr-1" /> New conversation
          </Button>
        </div>
      )}

      {empty ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-4 px-6 text-center">
          <MessageSquareText className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Ask about the inspection readings</p>
            <p className="text-sm text-muted-foreground">Pick a question to start, or type your own below.</p>
          </div>
          <div className="max-w-xl">{chips(false)}</div>
        </div>
      ) : (
        <GenieChatMessageList
          messages={messages}
          status={status}
          hasPreviousPage={hasPreviousPage}
          onFetchPreviousPage={fetchPreviousPage}
        />
      )}

      {error && <div className="shrink-0 px-4 py-2 text-sm text-destructive bg-destructive/10 border-t">{error}</div>}

      {!empty && <div className="shrink-0 px-4 pt-2">{chips(true)}</div>}
      <GenieChatInput onSend={sendMessage} disabled={busy} placeholder="Ask a question about the gauge readings…" />
    </div>
  );
}
