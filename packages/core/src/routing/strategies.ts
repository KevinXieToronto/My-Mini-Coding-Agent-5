import {
  ModelRouter,
  type RoutingContext,
  type RoutingDecision,
  type RoutingStrategy,
} from './router.js';

export const FAST_MODEL = 'gpt-4o-mini';
export const SMART_MODEL = 'gpt-4o';

/**
 * 最高优先级：显式的 --model 标志永远胜出。
 * 对应真实的 OverrideStrategy。
 */
export class OverrideStrategy implements RoutingStrategy {
  readonly name = 'override';

  constructor(private readonly model?: string) {}

  async route(): Promise<RoutingDecision | null> {
    if (!this.model) {
      return null;
    }
    return {
      model: this.model,
      source: this.name,
      reason: 'model was set explicitly with --model',
    };
  }
}

/**
 * 启发式复杂度分类器：把闻起来就很难的活儿交给更大的模型，
 * 否则保持沉默。真实的 ClassifierStrategy 会去问一个小型
 * LLM，而不是使用关键字规则——不过在链中的位置是一样的。
 */
export class ClassifierStrategy implements RoutingStrategy {
  readonly name = 'classifier';

  private static readonly COMPLEX_KEYWORDS = [
    'refactor',
    'architect',
    'debug',
    'analyze',
    'implement',
    'migrate',
    'optimize',
    'design',
    'step by step',
  ];

  async route(context: RoutingContext): Promise<RoutingDecision | null> {
    const prompt = context.prompt.toLowerCase();

    const hits = ClassifierStrategy.COMPLEX_KEYWORDS.filter((keyword) =>
      prompt.includes(keyword),
    );
    if (hits.length > 0) {
      return {
        model: SMART_MODEL,
        source: this.name,
        reason: `complex keywords: ${hits.join(', ')}`,
      };
    }

    if (context.prompt.length > 400) {
      return {
        model: SMART_MODEL,
        source: this.name,
        reason: `long prompt (${context.prompt.length} chars)`,
      };
    }

    if (context.historyLength > 20) {
      return {
        model: SMART_MODEL,
        source: this.name,
        reason: `deep conversation (${context.historyLength} history entries)`,
      };
    }

    return null; // 看起来很简单——不发表意见
  }
}

/**
 * 终结策略：总是给出答案，因此这条链一定能解析出结果。
 * 对应真实的 DefaultStrategy。
 */
export class DefaultStrategy implements RoutingStrategy {
  readonly name = 'default';

  async route(): Promise<RoutingDecision> {
    return {
      model: FAST_MODEL,
      source: this.name,
      reason: 'no earlier strategy claimed the request',
    };
  }
}

/** 标准链条：override → classifier → default。 */
export function createDefaultRouter(modelOverride?: string): ModelRouter {
  return new ModelRouter([
    new OverrideStrategy(modelOverride),
    new ClassifierStrategy(),
    new DefaultStrategy(),
  ]);
}
