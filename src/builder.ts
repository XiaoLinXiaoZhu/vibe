import type { z } from 'zod';
import type { vibe } from './vibe.js';

/**
 * 函数调用构建器
 * 支持链式调用：v.函数名(参数) 或 v.函数名(参数)(schema)
 */
export class FunctionCallBuilder {
  private vibeInstance: vibe;
  private functionName: string;
  private args: unknown[];
  private outputSchema?: z.ZodType<unknown>;
  private promise?: Promise<unknown>;

  constructor(vibeInstance: vibe, functionName: string, args: unknown[]) {
    this.vibeInstance = vibeInstance;
    this.functionName = functionName;
    this.args = args;
  }

  /**
   * 设置输出类型 schema
   */
  withSchema<T extends z.ZodType<unknown>>(schema: T): FunctionCallBuilder {
    this.outputSchema = schema;
    return this;
  }

  /**
   * 获取或创建 Promise
   */
  private getPromise(): Promise<unknown> {
    if (!this.promise) {
      this.promise = (this.vibeInstance as any).handleCall(
        this.functionName,
        this.args,
        this.outputSchema
      );
    }
    return this.promise!;
  }

  /**
   * 更新 schema（如果调用时传入了参数）
   */
  private updateSchema(schema?: z.ZodType<unknown>): void {
    if (schema) {
      this.outputSchema = schema;
      // 重新创建 promise
      this.promise = undefined;
    }
  }

  /**
   * 支持 await 直接调用
   */
  then<TResult = unknown, TError = unknown>(
    onfulfilled?: ((value: unknown) => TResult | Promise<TResult>),
    onrejected?: ((reason: TError) => TResult | Promise<TResult>)
  ): Promise<TResult | unknown> {
    return this.getPromise().then(onfulfilled, onrejected);
  }

  /**
   * 支持 catch
   */
  catch<TResult = unknown>(
    onrejected?: ((reason: unknown) => TResult | Promise<TResult>)
  ): Promise<unknown> {
    return this.getPromise().catch(onrejected);
  }

  /**
   * 支持 finally
   */
  finally(onfinally?: (() => void)): Promise<unknown> {
    return this.getPromise().finally(onfinally);
  }

  /**
   * 可调用对象：接受 schema 参数
   */
  async __call(schema?: z.ZodType<unknown>): Promise<unknown> {
    this.updateSchema(schema);
    return this.getPromise();
  }
}
