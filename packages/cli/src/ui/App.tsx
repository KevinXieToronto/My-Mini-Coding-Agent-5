import {
  Agent,
  GeminiChat,
  type ConfirmFn,
  type ToolCall,
} from '@mini-gemini/core';
import { Box, Text, useInput } from 'ink';
import { useCallback, useMemo, useState } from 'react';
import { buildRegistry } from '../tools.js';

interface Message {
  role: 'user' | 'model' | 'tool' | 'error';
  text: string;
}

interface PendingApproval {
  call: ToolCall;
  resolve: (approved: boolean) => void;
}

export function App({ apiKey }: { apiKey: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [busy, setBusy] = useState(false);

  // Approval bridge: the agent loop awaits this promise; the y/n
  // keypress below resolves it. This is how an imperative async loop
  // and a declarative UI meet.
  const confirm: ConfirmFn = useCallback(
    (call) =>
      new Promise<boolean>((resolve) => {
        setPending({ call, resolve });
      }),
    [],
  );

  // One Agent for the whole session — its GeminiChat keeps the
  // conversation history, so follow-up questions have context.
  const agent = useMemo(() => {
    const registry = buildRegistry();
    const chat = new GeminiChat(apiKey, registry);
    return new Agent(chat, registry, confirm);
  }, [apiKey, confirm]);

  const submit = useCallback(
    async (prompt: string) => {
      setMessages((m) => [...m, { role: 'user', text: prompt }]);
      setBusy(true);
      try {
        for await (const event of agent.run(prompt)) {
          if (event.type === 'text') {
            // Stream: extend the last model message, or start one.
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === 'model') {
                return [
                  ...m.slice(0, -1),
                  { role: 'model', text: last.text + event.text },
                ];
              }
              return [...m, { role: 'model', text: event.text }];
            });
          } else if (event.type === 'tool_result') {
            const summary = event.output.split('\n')[0];
            setMessages((m) => [
              ...m,
              {
                role: 'tool',
                text: event.skipped
                  ? `✗ ${event.name} (denied)`
                  : `✓ ${event.name} — ${summary}`,
              },
            ]);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        setMessages((m) => [...m, { role: 'error', text: message }]);
      }
      setBusy(false);
    },
    [agent],
  );

  useInput((input, key) => {
    // Approval mode: only y/n matter.
    if (pending) {
      if (input.toLowerCase() === 'y') {
        pending.resolve(true);
        setPending(null);
      } else if (input.toLowerCase() === 'n' || key.escape) {
        pending.resolve(false);
        setPending(null);
      }
      return;
    }
    if (busy) {
      return;
    }
    if (key.return) {
      const prompt = draft.trim();
      if (prompt) {
        setDraft('');
        void submit(prompt);
      }
    } else if (key.backspace || key.delete) {
      setDraft((d) => d.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setDraft((d) => d + input);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        mini-gemini
      </Text>
      <Text dimColor>Type a message and press Enter. Ctrl+C to quit.</Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((message, index) => (
          <Box key={index} marginBottom={message.role === 'tool' ? 0 : 1}>
            {message.role === 'user' && (
              <Text color="green">{'> '}{message.text}</Text>
            )}
            {message.role === 'model' && <Text>{message.text}</Text>}
            {message.role === 'tool' && (
              <Text color="yellow">{message.text}</Text>
            )}
            {message.role === 'error' && (
              <Text color="red">Error: {message.text}</Text>
            )}
          </Box>
        ))}
      </Box>
      {pending ? (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>
            Allow{' '}
            <Text bold color="yellow">
              {pending.call.name}
            </Text>
            ({JSON.stringify(pending.call.args)})?{' '}
            <Text dimColor>[y/n]</Text>
          </Text>
        </Box>
      ) : busy ? (
        <Text dimColor>thinking…</Text>
      ) : (
        <Text>
          <Text color="cyan">{'> '}</Text>
          {draft}
          <Text dimColor>▌</Text>
        </Text>
      )}
    </Box>
  );
}
