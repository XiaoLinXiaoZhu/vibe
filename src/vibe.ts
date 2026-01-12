import { FunctionCacheManager } from './cache.js';
import { LLMService } from './llm.js';
import { Logger, LogEntry } from './logger.js';
import { FunctionCallBuilder } from './builder.js';
import { mergeConfig } from './config.js';
import type { VibeConfig, CacheKey } from './types.js';
import type { z } from 'zod';

/**
 * Vibe 主类
 */
export class vibe {
  private config: ReturnType<typeof mergeConfig>;
  private functionCache: FunctionCacheManager;
  private llm: LLMService;
  private logger: Logger;

  constructor(config: VibeConfig = {}) {
    this.config = mergeConfig(config);
    const functionCacheDir = `${this.config.cacheDir}/functions`;
    const logDir = `${this.config.cacheDir}/reports`;
    
    this.functionCache = new FunctionCacheManager(functionCacheDir);
    this.logger = new Logger(logDir);
    this.llm = new LLMService(
      this.config.apiKey,
      this.config.baseUrl,
      this.config.model
    );
    
    // 初始化缓存目录和日志目录
    this.functionCache.init().catch(console.error);
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
    const fn = new Function('args', `"use strict";\n${code}`);
    return fn(args);
  }

  /**
   * 验证输出类型
   */
  private validateOutput(output: unknown, schema: z.ZodType<unknown>): unknown {
    const result = schema.safeParse(output);
    if (result.success) {
      return result.data;
    }
    if (this.config.strict) {
      throw new Error(`Output validation failed: ${result.error.message}`);
    }
    return output;
  }

  /**
   * 核心方法：处理函数调用
   */
  async handleCall(functionName: string, args: unknown[], outputSchema?: z.ZodType<unknown>): Promise<unknown> {
    const startTime = Date.now();
    const cacheKey = this.createCacheKey(functionName, args, outputSchema);
    
    const logEntry: LogEntry = {
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
      const cached = await this.functionCache.get(cacheKey);
      if (cached) {
        logEntry.fromCache = true;
        logEntry.code = cached.code;
        const result = this.executeCode(cached.code, args);
        const finalResult = outputSchema ? this.validateOutput(result, outputSchema) : result;
        logEntry.result = finalResult;
        return finalResult;
      }

      // 调用 LLM 生成代码
      const llmResult = await this.llm.generateFunctionCode(functionName, args, outputSchema);
      
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

      // 执行代码并验证
      const result = this.executeCode(llmResult.code, args);
      const finalResult = outputSchema ? this.validateOutput(result, outputSchema) : result;

      // 缓存结果
      await this.functionCache.set(cacheKey, {
        code: llmResult.code,
        createdAt: Date.now(),
      });

      logEntry.result = finalResult;
      return finalResult;
    } catch (error) {
      logEntry.success = false;
      logEntry.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      logEntry.executionTime = Date.now() - startTime;
      await this.logger.log(logEntry);
    }
  }

  /**
   * 清除缓存（内部方法）
   */
  async clearCache(): Promise<void> {
    await this.functionCache.clear();
  }

  /**
   * 读取日志（内部方法）
   */
  async readLogs(date?: string): Promise<LogEntry[]> {
    return this.logger.readLogs(date);
  }

  /**
   * 清空日志（内部方法）
   */
  async clearLogs(): Promise<void> {
    await this.logger.clearLogs();
  }
}

/**
 * 装饰器函数：将方法替换为 LLM 生成的实现
 */
export function vibeFn(_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): void {
  descriptor.value = async function (...args: unknown[]) {
    const vibeInstance = (this as any)._vibeInstance;
    if (!vibeInstance) {
      throw new Error('@vibeFn requires @VibeClass decorator on the class.');
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
export function createVibe(config: VibeConfig = {}): any {
  const instance = new vibe(config);
  return new Proxy(instance, {
    get(_target, prop: string) {
      return (...args: unknown[]) => {
        const builder = new FunctionCallBuilder(instance, prop, args);
        return new Proxy(builder, {
          apply: (_t, _this, [schema]) => builder.__call(schema),
        });
      };
    },
  });
}

/**
 * Vibe 实用方法对象
 * 提供 clearCache, readLogs 等工具方法
 */
class VibeUtils {
  private static instance?: vibe;

  private static getInstance(config?: VibeConfig): vibe {
    if (!this.instance) {
      this.instance = new vibe(config);
    }
    return this.instance;
  }

  /**
   * 清除所有缓存
   */
  static clearCache(config?: VibeConfig): Promise<void> {
    return this.getInstance(config).clearCache();
  }

  /**
   * 读取日志
   */
  static readLogs(date?: string, config?: VibeConfig): Promise<LogEntry[]> {
    return this.getInstance(config).readLogs(date);
  }

  /**
   * 清空所有日志
   */
  static clearLogs(config?: VibeConfig): Promise<void> {
    return this.getInstance(config).clearLogs();
  }
}

export const vibeUtils = VibeUtils;
