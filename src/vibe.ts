import { CacheManager } from './cache.js';
import { LLMService } from './llm.js';
import { Logger, LogEntry } from './logger.js';
import { mergeConfig } from './config.js';
import type { VibeConfig, CacheKey } from './types.js';
import type { z } from 'zod';

/**
 * Vibe 主类
 */
export class vibe {
  private config: ReturnType<typeof mergeConfig>;
  private cache: CacheManager;
  private llm: LLMService;
  private logger: Logger;

  constructor(config: VibeConfig = {}) {
    this.config = mergeConfig(config);
    const logDir = this.config.cacheDir.replace('/cache', '/logs');
    
    this.cache = new CacheManager(this.config.cacheDir);
    this.logger = new Logger(logDir);
    this.llm = new LLMService(
      this.config.apiKey,
      this.config.baseUrl,
      this.config.model
    );
    
    // 初始化缓存目录和日志目录
    this.cache.init().catch(console.error);
    this.logger.init().catch(console.error);
  }

  /**
   * 创建缓存键
   */
  private createCacheKey(functionName: string, args: unknown[], outputSchema?: z.ZodType<unknown>): CacheKey {
    return {
      functionName,
      paramsType: args.map(arg => typeof arg).join('|'),
      outputType: outputSchema ? outputSchema.constructor.name : undefined,
    };
  }

  /**
   * 执行代码
   */
  private executeCode(code: string, args: unknown[]): unknown {
    try {
      // 创建函数并执行
      const fn = new Function('args', `"use strict";\n${code}`);
      return fn(args);
    } catch (error) {
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证输出类型
   */
  private validateOutput(output: unknown, schema: z.ZodType<unknown>): unknown {
    if (this.config.strict) {
      try {
        return schema.parse(output);
      } catch (error) {
        throw new Error(`Output type validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // 非 strict 模式，尝试解析，失败则返回原始值
      try {
        return schema.parse(output);
      } catch {
        return output;
      }
    }
  }

  /**
   * 核心方法：处理函数调用
   */
  private async handleCall(functionName: string, args: unknown[], outputSchema?: z.ZodType<unknown>): Promise<unknown> {
    const startTime = Date.now();
    const cacheKey = this.createCacheKey(functionName, args, outputSchema);
    
    let logEntry: LogEntry = {
      timestamp: Date.now(),
      functionName,
      args,
      outputSchema: outputSchema ? JSON.stringify(outputSchema) : undefined,
      fromCache: false,
      success: true,
      executionTime: 0,
    };

    try {
      // 尝试从缓存获取
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logEntry.fromCache = true;
        logEntry.code = cached.code;
        
        const result = this.executeCode(cached.code, args);
        const finalResult = outputSchema ? this.validateOutput(result, outputSchema) : result;
        
        logEntry.result = finalResult;
        logEntry.executionTime = Date.now() - startTime;
        
        await this.logger.log(logEntry);
        return finalResult;
      }

      // 调用 LLM 生成代码
      const llmResult = await this.llm.generateFunctionCode(functionName, args, outputSchema);
      
      // 记录 LLM 请求和响应
      logEntry.code = llmResult.code;
      logEntry.llmRequest = {
        systemPrompt: llmResult.systemPrompt,
        userPrompt: llmResult.userPrompt,
        model: llmResult.model,
        temperature: llmResult.temperature,
        maxTokens: llmResult.maxTokens,
      };
      logEntry.llmResponse = {
        rawContent: llmResult.rawContent,
        finishReason: llmResult.finishReason,
        usage: llmResult.usage,
      };

      // 执行代码
      const result = this.executeCode(llmResult.code, args);

      // 类型验证
      let finalResult = result;
      if (outputSchema) {
        finalResult = this.validateOutput(result, outputSchema);
      }

      // 缓存结果
      await this.cache.set(cacheKey, {
        code: llmResult.code,
        createdAt: Date.now(),
      });

      logEntry.result = finalResult;
      logEntry.executionTime = Date.now() - startTime;
      
      await this.logger.log(logEntry);
      return finalResult;
    } catch (error) {
      logEntry.success = false;
      logEntry.error = error instanceof Error ? error.message : String(error);
      logEntry.executionTime = Date.now() - startTime;
      
      await this.logger.log(logEntry);
      throw error;
    }
  }

  /**
   * Proxy handler
   */
  private createProxy(): ProxyHandler<vibe> {
    const self = this;
    return {
      get(target, prop: string) {
        if (prop in target) {
          // 返回实例方法
          return target[prop as keyof vibe];
        }

        // 返回一个函数，接受参数并执行
        return async (...args: unknown[]) => {
          return self.handleCall(prop, args);
        };
      },
    };
  }

  /**
   * 创建一个接受 zod schema 的函数
   */
  withSchema<T extends z.ZodType<unknown>>(
    schema: T,
    functionName: string,
    ...args: unknown[]
  ): Promise<z.infer<T>> {
    return this.handleCall(functionName, args, schema) as Promise<z.infer<T>>;
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * 读取日志
   */
  async readLogs(date?: string): Promise<LogEntry[]> {
    return this.logger.readLogs(date);
  }

  /**
   * 清空日志
   */
  async clearLogs(): Promise<void> {
    await this.logger.clearLogs();
  }
}

/**
 * 装饰器工厂函数
 * 注意：使用 @vibeFn 的方法，函数体会被 LLM 生成的代码替换
 */
export function vibeFn(target: unknown, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: unknown[]) {
    const self = this as any;
    const vibeInstance = self._vibeInstance || (self.constructor as any)._vibeInstance;

    if (!vibeInstance) {
      throw new Error('@vibeFn decorator requires vibe instance. Use @VibeClass decorator on the class first.');
    }

    return vibeInstance.handleCall(propertyKey, args);
  };
}

/**
 * 类装饰器：初始化 vibe 实例
 */
export function VibeClass(config: VibeConfig = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const vibeInstance = new vibe(config);
    
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        (this as any)._vibeInstance = vibeInstance;
      }
    };
  };
}

/**
 * 创建并返回 vibe 实例的便捷函数
 */
export function createVibe(config: VibeConfig = {}): vibe {
  return new Proxy(new vibe(config), (new vibe(config)).createProxy());
}
