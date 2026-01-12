import type { z } from 'zod';
import type { vibe } from './vibe.js';

/**
 * 函数调用构建器
 * 支持链式调用：v.函数名(参数) 或 v.函数名(参数)(schema)
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
    return this.vibeInstance.handleCall(this.functionName, this.args, this.outputSchema, this.vibeProxy);
  }

  async __call(schema?: z.ZodType<unknown>): Promise<unknown> {
    if (schema) this.outputSchema = schema;
    return this.vibeInstance.handleCall(this.functionName, this.args, this.outputSchema, this.vibeProxy);
  }
}
