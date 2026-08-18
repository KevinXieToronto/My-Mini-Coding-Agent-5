import { describe, expect, it } from 'vitest';
import { truncate } from './text.js';

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('cuts long text and reports how much was omitted', () => {
    const result = truncate('a'.repeat(30), 10);
    expect(result).toBe(`${'a'.repeat(10)}\n... [truncated 20 characters]`);
  });

  it('treats text exactly at the limit as short', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
});
