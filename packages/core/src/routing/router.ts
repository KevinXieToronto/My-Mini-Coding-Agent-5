/** 策略在做决定时能看到的信息。 */
export interface RoutingContext {
  prompt: string;
  historyLength: number;
}

/** 一个具体的选择，附带用于展示与调试的来源信息。 */
export interface RoutingDecision {
  model: string;
  source: string;
  reason: string;
}

/**
 * 链中的一环：返回一个决定，或返回 null 让下一个策略发言。
 * 对应真实项目 packages/core/src/routing 中的 RoutingStrategy。
 */
export interface RoutingStrategy {
  name: string;
  route(context: RoutingContext): Promise<RoutingDecision | null>;
}

/**
 * 按优先级顺序运行各策略，返回第一个决定。
 * 对应 ModelRouterService + CompositeStrategy。
 */
export class ModelRouter {
  constructor(private readonly strategies: RoutingStrategy[]) {}

  async route(context: RoutingContext): Promise<RoutingDecision> {
    for (const strategy of this.strategies) {
      const decision = await strategy.route(context);
      if (decision) {
        return decision;
      }
    }
    throw new Error(
      'No routing decision was made — the chain must end with a terminal strategy.',
    );
  }
}
