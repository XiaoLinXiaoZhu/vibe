import OpenAI from 'openai';
import type { z } from 'zod';

/**
 * LLM 生成结果
 */
export interface LLMGenerateResult {
  /** 清理后的代码 */
  code: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户提示词 */
  userPrompt: string;
  /** 模型名称 */
  model: string;
  /** 温度参数 */
  temperature: number;
  /** 最大 tokens */
  maxTokens: number;
  /** 原始响应内容 */
  rawContent: string;
  /** 结束原因 */
  finishReason?: string;
  /** Token 使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM 服务
 */
export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.model = model;
  }

  /**
   * 生成函数实现代码
   */
  async generateFunctionCode(
    functionName: string,
    args: unknown[],
    outputSchema?: z.ZodType<unknown>
  ): Promise<LLMGenerateResult> {
    const schemaDescription = outputSchema
      ? `\nOutput schema: ${JSON.stringify(outputSchema)}\nThe output MUST satisfy this schema.`
      : '';

    const systemPrompt = 'You are a JavaScript expert. Generate clean, efficient JavaScript code. Return ONLY the function code, no markdown, no backticks.';
    const userPrompt = `Generate a JavaScript function for "${functionName}".
Arguments: ${args.length > 0 ? JSON.stringify(args) : 'None'}${schemaDescription}

Requirements:
- Access arguments via args array: args[0], args[1], etc.
- Return the result directly
- Use JavaScript/async syntax (await is supported)

Available global objects:
- v: vibe instance for calling other AI functions (e.g., await v.otherFunction(args))
- z: zod library for schema validation (e.g., z.string(), z.number(), z.object({...}))

For complex tasks, you can compose functions by calling v recursively.
Example: await v["helper function"](data)(z.string())

Return ONLY executable code, nothing else.`;

    const temperature = 0.3;
    const maxTokens = 2000;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const rawContent = response.choices[0]?.message?.content?.trim() || '';
    const code = this.cleanCode(rawContent);

    return {
      code,
      systemPrompt,
      userPrompt,
      model: this.model,
      temperature,
      maxTokens,
      rawContent,
      finishReason: response.choices[0]?.finish_reason,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * 清理代码（移除 markdown 标记）
   */
  private cleanCode(code: string): string {
    return code
      .replace(/^```(?:typescript|ts|javascript|js)?\s*\n/i, '')
      .replace(/\n```$/, '')
      .trim();
  }
}
