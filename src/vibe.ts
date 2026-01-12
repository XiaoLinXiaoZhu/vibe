import { FunctionCacheManager } from './cache.js';
import { LLMService } from './llm.js';
import { Logger, LogEntry } from './logger.js';
import { FunctionCallBuilder } from './builder.js';
import { mergeConfig } from './config.js';
import type { VibeConfig, CacheKey } from './types.js';
import type { z } from 'zod';
import * as zodNamespace from 'zod';

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
   * @param code 要执行的代码
   * @param args 参数数组
   * @param vibeProxy vibe 实例的 proxy，供代码中使用
   * @param depth 当前调用深度
   */
  private async executeCode(code: string, args: unknown[], vibeProxy: any, depth: number): Promise<unknown> {
    try {
      // 使用 AsyncFunction 支持 await
      const AsyncFunction = (async function () {}).constructor as FunctionConstructor;
      // 创建带深度信息的 proxy
      const depthAwareProxy = this.createDepthAwareProxy(vibeProxy, depth + 1);
      const fn = new AsyncFunction('args', 'v', 'z', `"use strict";\n${code}`);
      return await fn(args, depthAwareProxy, zodNamespace);
    } catch (error) {
      // 如果代码有语法错误，记录详细信息
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Code execution failed: ${errorMsg}\n\nGenerated code:\n${code}`);
    }
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
   * @param depth 当前调用深度，用于防止无限递归
   */
  async handleCall(functionName: string, args: unknown[], outputSchema?: z.ZodType<unknown>, vibeProxy?: any, depth: number = 0): Promise<unknown> {
    const startTime = Date.now();
    const cacheKey = this.createCacheKey(functionName, args, outputSchema);
    const maxDepth = 5;
    
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
        const result = await this.executeCode(cached.code, args, vibeProxy, depth);
        const finalResult = outputSchema ? this.validateOutput(result, outputSchema) : result;
        logEntry.result = finalResult;
        return finalResult;
      }

      // 调用 LLM 生成代码
      const isLastCall = depth >= maxDepth - 1;
      const llmResult = await this.llm.generateFunctionCode(functionName, args, outputSchema, isLastCall);
      
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
      const result = await this.executeCode(llmResult.code, args, vibeProxy, depth);
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
   * 创建带深度信息的 proxy
   */
  private createDepthAwareProxy(originalProxy: any, depth: number): any {
    const instance = this;
    return new Proxy(originalProxy, {
      get(_target, prop: string | symbol) {
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') {
          return undefined;
        }
        
        return (...args: unknown[]) => {
          const builder = new FunctionCallBuilder(instance, String(prop), args, originalProxy, depth);
          
          const callableFunction = function(schema?: z.ZodType<unknown>) {
            return builder.__call(schema);
          };
          
          Object.assign(callableFunction, {
            then: builder.then.bind(builder),
            catch: builder.catch.bind(builder),
            finally: builder.finally.bind(builder),
            withSchema: builder.withSchema.bind(builder),
          });
          
          return callableFunction;
        };
      },
    });
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
 * 创建并返回 vibe 实例的便捷函数
 * 支持多种调用方式：
 * - v.functionName(args)
 * - v["functionName"](args)
 * - v.functionName(args)(schema)
 * - v["functionName"](args)(schema)
 */
export function createVibe(config: VibeConfig = {}): any {
  const instance = new vibe(config);
  const vibeProxy = new Proxy(instance, {
    get(_target, prop: string | symbol) {
      // 跳过 Symbol 属性和内部属性
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') {
        return undefined;
      }
      
      return (...args: unknown[]) => {
        const builder = new FunctionCallBuilder(instance, String(prop), args, vibeProxy, 0);
        
        // 创建一个函数作为 Proxy 的 target，这样 apply trap 才能工作
        const callableFunction = function(schema?: z.ZodType<unknown>) {
          return builder.__call(schema);
        };
        
        // 将 builder 的方法复制到函数上
        Object.assign(callableFunction, {
          then: builder.then.bind(builder),
          catch: builder.catch.bind(builder),
          finally: builder.finally.bind(builder),
          withSchema: builder.withSchema.bind(builder),
        });
        
        return callableFunction;
      };
    },
  });
  return vibeProxy;
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
