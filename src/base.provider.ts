import { CasingEnum, transformKeys, deepMerge } from './utils';
import type { WithPassthrough } from './types';

export { CasingEnum };

export type MergedPassthrough<T> = {
  body: T;
  headers: Record<string, string>;
  query: Record<string, string>;
};

export abstract class BaseProvider {
  protected abstract casing: CasingEnum;

  protected transform<T>(
    bridgeProviderData: WithPassthrough<Record<string, unknown>>,
    triggerData: Record<string, unknown>
  ): MergedPassthrough<T> {
    const { _passthrough, ...knownData } = bridgeProviderData;

    const mergedBody = deepMerge(
      {},
      this.casingTransform(triggerData),
      this.casingTransform(knownData),
      _passthrough?.body ?? {}
    );

    return {
      body: mergedBody as T,
      headers: _passthrough?.headers ?? {},
      query: _passthrough?.query ?? {},
    };
  }

  private casingTransform(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return transformKeys(data, this.casing);
  }
}
