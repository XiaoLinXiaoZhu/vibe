import { VibeConfig } from './types.js';

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): VibeConfig {
  return {
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
    baseUrl: process.env.LLM_BASE_URL,
    cacheDir: process.env.CACHE_DIR || '.vibe/cache',
    strict: process.env.STRICT === 'true',
  };
}

/**
 * 合并配置，优先使用用户提供的配置
 */
export function mergeConfig(userConfig: VibeConfig = {}): Required<VibeConfig> {
  const envConfig = loadConfigFromEnv();
  
  return {
    apiKey: userConfig.apiKey ?? envConfig.apiKey ?? '',
    model: userConfig.model ?? envConfig.model ?? 'gpt-4',
    baseUrl: userConfig.baseUrl ?? envConfig.baseUrl ?? 'https://api.openai.com/v1',
    cacheDir: userConfig.cacheDir ?? envConfig.cacheDir ?? '.vibe/cache',
    strict: userConfig.strict ?? envConfig.strict ?? false,
  };
}
