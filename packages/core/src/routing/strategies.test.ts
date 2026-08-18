import { describe, expect, it } from 'vitest';
import {
  createDefaultRouter,
  FAST_MODEL,
  SMART_MODEL,
} from './strategies.js';

describe('createDefaultRouter', () => {
  it('routes simple prompts to the fast model via the default strategy', async () => {
    const router = createDefaultRouter();
    const decision = await router.route({
      prompt: 'What time is it in Tokyo?',
      historyLength: 0,
    });
    expect(decision.model).toBe(FAST_MODEL);
    expect(decision.source).toBe('default');
  });

  it('routes complex-sounding prompts to the smart model via the classifier', async () => {
    const router = createDefaultRouter();
    const decision = await router.route({
      prompt: 'Refactor the tool registry to support namespaces',
      historyLength: 0,
    });
    expect(decision.model).toBe(SMART_MODEL);
    expect(decision.source).toBe('classifier');
  });

  it('lets --model beat everything', async () => {
    const router = createDefaultRouter('gpt-4o-mini');
    const decision = await router.route({
      prompt: 'Please refactor and re-architect everything',
      historyLength: 99,
    });
    expect(decision.model).toBe('gpt-4o-mini');
    expect(decision.source).toBe('override');
  });
});
