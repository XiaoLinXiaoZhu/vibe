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
      ? `\nOutput type schema (Zod):\n${JSON.stringify(outputSchema)}\n\nIMPORTANT: The output MUST satisfy this schema.`
      : '';

    const userPrompt = this.buildPrompt(functionName, args, schemaDescription);
    const systemPrompt = 'You are a JavaScript expert. Generate clean, efficient, and correct JavaScript function implementations. Return ONLY the function code, no explanations, no markdown, no backticks.';

    try {
      const temperature = 0.3;
      const maxTokens = 2000;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const rawContent = response.choices[0]?.message?.content?.trim() || '';
      const finishReason = response.choices[0]?.finish_reason;
      const usage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined;
      
      // 清理代码（移除可能的 markdown 代码块标记）
      const code = this.cleanCode(rawContent);

      return {
        code,
        systemPrompt,
        userPrompt,
        model: this.model,
        temperature,
        maxTokens,
        rawContent,
        finishReason,
        usage,
      };
    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(functionName: string, args: unknown[], schemaDescription: string): string {
    const argsDescription = args.length > 0
      ? `\nArguments: ${JSON.stringify(args, null, 2)}`
      : '\nNo arguments provided.';

    return `Generate a JavaScript function implementation for the function "${functionName}".
${argsDescription}${schemaDescription}

Requirements:
1. The function must be a pure function (no side effects)
2. Return the result directly (no console.log)
3. Handle edge cases appropriately
4. Use JavaScript syntax and include only the function body code (no function declaration, no export)
5. Access arguments via the 'args' array: args[0], args[1], etc.

Return ONLY the code that should be executed, nothing else. For example:
return args[0] + args[1];
`;
  }

  /**
   * 清理代码（移除 markdown 和其他标记）
   */
  private cleanCode(code: string): string {
    // 移除可能的 markdown 代码块标记
    code = code.replace(/^```(?:typescript|ts|javascript|js)?\s*\n/i, '');
    code = code.replace(/\n```$/, '');
    code = code.trim();
    
    // 如果代码包含完整的函数声明，提取函数体
    const functionBodyMatch = code.match(/\{[\s\S]*\}$/);
    if (functionBodyMatch) {
      let body = functionBodyMatch[0];
      // 移除外层的大括号
      if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1);
      }
      return body.trim();
    }
    
    return code;
  }
}
