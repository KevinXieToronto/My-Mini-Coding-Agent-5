import {
  Agent,
  GeminiChat,
  type ConfirmFn,
  type ModelRouter,
  type ToolCall,
  type ToolRegistry,
} from '@mini-gemini/core';
import { Box, Text, useInput } from 'ink';
import { useCallback, useMemo, useState } from 'react';

interface Message {
  role: 'user' | 'model' | 'tool' | 'info' | 'error';
  text: string;
}

interface PendingApproval {
  call: ToolCall;
  resolve: (approved: boolean) => void;
}

export function App({
  apiKey,
  registry,
  router,
}: {
  apiKey: string;
  registry: ToolRegistry;
  router: ModelRouter;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [busy, setBusy] = useState(false);

  // 审批桥接：Agent 循环等待这个 promise；下面的 y/n
  // 按键会将其 resolve。
  const confirm: ConfirmFn = useCallback(
    (call) =>
      new Promise<boolean>((resolve) => {
        setPending({ call, resolve });
      }),
    [],
  );

  // 整个会话只用一个 Agent —— 它的 GeminiChat 保存着对话
  // 历史，所以后续追问是有上下文的。
  const agent = useMemo(() => {
    const chat = new GeminiChat(apiKey, registry, router);
    return new Agent(chat, registry, confirm);
  }, [apiKey, registry, router, confirm]);

  const submit = useCallback(
    async (prompt: string) => {
      setMessages((m) => [...m, { role: 'user', text: prompt }]);
      setBusy(true);
      try {
        for await (const event of agent.run(prompt)) {
          if (event.type === 'text') {
            // 流式输出：追加到最后一条模型消息，或新建一条。
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
          } else if (event.type === 'routing') {
            setMessages((m) => [
              ...m,
              {
                role: 'info',
                text: `model: ${event.decision.model} (${event.decision.source}: ${event.decision.reason})`,
              },
            ]);
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
    // 审批模式：只有 y/n 有意义。
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
          <Box
            key={index}
            marginBottom={
              message.role === 'tool' || message.role === 'info' ? 0 : 1
            }
          >
            {message.role === 'user' && (
              <Text color="green">{'> '}{message.text}</Text>
            )}
            {message.role === 'model' && <Text>{message.text}</Text>}
            {message.role === 'tool' && (
              <Text color="yellow">{message.text}</Text>
            )}
            {message.role === 'info' && <Text dimColor>{message.text}</Text>}
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
