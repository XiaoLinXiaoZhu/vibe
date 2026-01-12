import type { z } from 'zod';
import type { vibe } from './vibe.js';

/**
 * 函数调用构建器
 * 支持链式调用：v.函数名(参数) 或 v.函数名(参数)(schema)
 * 实现 PromiseLike 接口，可以被 await
 */
export class FunctionCallBuilder {
  constructor(
    private vibeInstance: vibe,
    private functionName: string,
    private args: unknown[],
    private vibeProxy?: any,
    private outputSchema?: z.ZodType<unknown>
  ) {}

  withSchema<T extends z.ZodType<unknown>>(schema: T): Promise<unknown> {
    this.outputSchema = schema;
    return this.execute();
  }

  async __call(schema?: z.ZodType<unknown>): Promise<unknown> {
    if (schema) this.outputSchema = schema;
    return this.execute();
  }

  // 实现 PromiseLike，使其可以被 await
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<unknown | TResult> {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<unknown> {
    return this.execute().finally(onfinally);
  }

  private execute(): Promise<unknown> {
    return this.vibeInstance.handleCall(
      this.functionName,
      this.args,
      this.outputSchema,
      this.vibeProxy
    );
  }
}
