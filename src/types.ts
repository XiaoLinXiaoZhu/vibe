import type { z } from 'zod';

/**
 * Vibe 配置接口
 */
export interface VibeConfig {
  /** LLM API 密钥 */
  apiKey?: string;
  /** LLM 模型名称 */
  model?: string;
  /** LLM API 基础 URL */
  baseUrl?: string;
  /** 缓存目录路径 */
  cacheDir?: string;
  /** 是否启用严格模式（严格验证输出类型） */
  strict?: boolean;
}

/**
 * 缓存键接口
 */
export interface CacheKey {
  /** 函数名 */
  functionName: string;
  /** 参数类型的字符串表示 */
  paramsType: string;
  /** 输出类型的字符串表示（如果有） */
  outputType?: string;
}

/**
 * 缓存项接口
 */
export interface CacheItem {
  /** 生成的代码 */
  code: string;
  /** 创建时间戳 */
  createdAt: number;
}
