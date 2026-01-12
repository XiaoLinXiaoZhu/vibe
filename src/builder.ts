import type { z } from 'zod';
import type { vibe } from './vibe.js';

/**
 * 函数调用构建器
 * 支持链式调用：v.函数名(参数) 或 v.函数名(参数)(schema)
 * 实现 PromiseLike 接口，可以被 await
 */
export class FunctionCallBuilder<T = unknown> {
  constructor(
    private vibeInstance: vibe,
    private functionName: string,
    private args: unknown[],
    private vibeProxy?: any,
    private depth: number = 0,
    private outputSchema?: z.ZodType<T>
  ) {}

  withSchema<S>(schema: z.ZodType<S>): Promise<S> {
    this.outputSchema = schema as any;
    return this.execute() as unknown as Promise<S>;
  }

  async __call<S>(schema?: z.ZodType<S>): Promise<S extends undefined ? T : S> {
    if (schema) this.outputSchema = schema as any;
    return this.execute() as any;
  }

  // 实现 PromiseLike，使其可以被 await
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.execute().finally(onfinally);
  }

  private execute(): Promise<T> {
    return this.vibeInstance.handleCall(
      this.functionName,
      this.args,
      this.outputSchema,
      this.vibeProxy,
      this.depth
    ) as Promise<T>;
  }
}
