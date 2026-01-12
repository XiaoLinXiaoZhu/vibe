import { VibeConfig } from './types.js';

/**
 * 合并配置，优先级：用户配置 > 环境变量 > 默认值
 */
export function mergeConfig(userConfig: VibeConfig = {}): Required<VibeConfig> {
  return {
    apiKey: userConfig.apiKey ?? process.env.LLM_API_KEY ?? '',
    model: userConfig.model ?? process.env.LLM_MODEL ?? 'gpt-4',
    baseUrl: userConfig.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    cacheDir: userConfig.cacheDir ?? process.env.CACHE_DIR ?? '.vibe',
    strict: userConfig.strict ?? process.env.STRICT === 'true',
  };
}
