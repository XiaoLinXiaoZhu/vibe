import { VibeConfig } from './types.js';

/**
 * 合并配置，优先级：用户配置 > 环境变量 > 默认值
 * @throws {Error} 当 apiKey 未提供时抛出明确错误
 */
export function mergeConfig(userConfig: VibeConfig = {}): Required<VibeConfig> {
  const apiKey = userConfig.apiKey ?? process.env.LLM_API_KEY ?? '';

  if (!apiKey) {
    throw new Error(
      '[vibe] API key is required. Provide it via:\n' +
      '  - createVibe({ apiKey: "your-key" })\n' +
      '  - Environment variable LLM_API_KEY\n'
    );
  }

  return {
    apiKey,
    model: userConfig.model ?? process.env.LLM_MODEL ?? 'gpt-4',
    baseUrl: userConfig.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    cacheDir: userConfig.cacheDir ?? process.env.CACHE_DIR ?? '.vibe',
    strict: userConfig.strict ?? process.env.STRICT === 'true',
    maxDepth: userConfig.maxDepth ?? (Number(process.env.MAX_DEPTH) || 5),
  };
}
