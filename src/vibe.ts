import { FunctionCacheManager } from './cache.js';
import { LLMService } from './llm.js';
import { Logger, LogEntry } from './logger.js';
import { FunctionCallBuilder } from './builder.js';
import { mergeConfig } from './config.js';
import type { VibeConfig, CacheKey } from './types.js';
import type { z } from 'zod';
import * as zodNamespace from 'zod';
import { exec } from 'child_process';

/**
 * shell() — child_process.exec 的 Promise 封装
 * 返回 { stdout, stderr }
 */
function shell(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Vibe 主类
 */
export class vibe {
  private config: ReturnType<typeof mergeConfig>;
  private functionCache: FunctionCacheManager;
  private llm: LLMService;
  private logger: Logger;
  private _initPromise: Promise<void> | null = null;

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
  }

  /**
   * 延迟初始化：首次调用时创建缓存和日志目录
   * 只执行一次，后续调用直接返回缓存的 Promise
   */
  private ensureInit(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = Promise.all([
        this.functionCache.init(),
        this.logger.init(),
      ]).then(() => {});
    }
    return this._initPromise;
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
      // 构建 context 对象，包含所有运行时能力
      const ctx = {
        args,
        v: depthAwareProxy,
        z: zodNamespace,
        shell,
        fetch: globalThis.fetch,
      };
      // 注入解构语句，让生成的代码可以直接使用 args/v/z/shell/fetch
      const wrappedCode = `"use strict";\nconst {args, v, z, shell, fetch} = _ctx;\n${code}`;
      const fn = new AsyncFunction('_ctx', wrappedCode);
      return await fn(ctx);
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
    await this.ensureInit();
    const startTime = Date.now();
    const cacheKey = this.createCacheKey(functionName, args, outputSchema);
    const maxDepth = this.config.maxDepth;
    
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

      // 调用 LLM 生成代码（带重试）
      const isLastCall = depth >= maxDepth - 1;
      const maxRetries = 2;
      let lastError: { code: string; error: string } | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const llmResult = await this.llm.generateFunctionCode(
          functionName, args, outputSchema, isLastCall,
          attempt > 0 ? lastError : undefined
        );

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

        try {
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
        } catch (execError) {
          const errorMsg = execError instanceof Error ? execError.message : String(execError);
          lastError = { code: llmResult.code, error: errorMsg };
          // 如果还有重试机会，继续循环；否则抛出
          if (attempt === maxRetries) {
            throw execError;
          }
        }
      }

      // 不应到达这里，但 TypeScript 需要
      throw lastError;
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
   * 创建 callable builder：将 FunctionCallBuilder 包装为可直接调用的函数
   * 统一 createVibe 和 createDepthAwareProxy 的 handler 逻辑
   */
  createCallable<T = unknown>(prop: string, args: unknown[], vibeProxy: any, depth: number) {
    const builder = new FunctionCallBuilder<T>(this, prop, args, vibeProxy, depth);

    const callableFunction = function(schema?: z.ZodType<T>) {
      return builder.__call(schema);
    };

    Object.assign(callableFunction, {
      then: builder.then.bind(builder),
      catch: builder.catch.bind(builder),
      finally: builder.finally.bind(builder),
      withSchema: builder.withSchema.bind(builder),
    });

    return callableFunction;
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
        return <T = unknown>(...args: unknown[]) =>
          instance.createCallable<T>(String(prop), args, originalProxy, depth);
      },
    });
  }

  /**
   * 清除缓存（内部方法）
   */
  async clearCache(): Promise<void> {
    await this.ensureInit();
    await this.functionCache.clear();
  }

  /**
   * 读取日志（内部方法）
   */
  async readLogs(date?: string): Promise<LogEntry[]> {
    await this.ensureInit();
    return this.logger.readLogs(date);
  }

  /**
   * 清空日志（内部方法）
   */
  async clearLogs(): Promise<void> {
    await this.ensureInit();
    await this.logger.clearLogs();
  }
}

/**
 * Vibe 实例类型
 */
export type VibeInstance = {
  [key: string]: <T = unknown>(...args: unknown[]) => FunctionCallBuilder<T> & {
    (schema?: z.ZodType<T>): Promise<T>;
    withSchema: <S>(schema: z.ZodType<S>) => Promise<S>;
  };
};

/**
 * 创建并返回 vibe 实例的便捷函数
 * 支持多种调用方式：
 * - v.functionName(args)
 * - v["functionName"](args)
 * - v.functionName(args)(schema)
 * - v["functionName"](args)(schema)
 * - v.functionName<T>(args)(schema)
 */
export function createVibe(config: VibeConfig = {}): VibeInstance {
  const instance = new vibe(config);
  const vibeProxy = new Proxy(instance, {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') {
        return undefined;
      }
      return <T = unknown>(...args: unknown[]) =>
        instance.createCallable<T>(String(prop), args, vibeProxy, 0);
    },
  });
  return vibeProxy as unknown as VibeInstance;
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
