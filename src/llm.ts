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
- DO NOT wrap code in function declaration (no "function name()" or "async function")
- Return ONLY the function body code

Available global objects:
- v: vibe instance for calling other AI functions (e.g., await v.otherFunction(args))
- z: zod library for schema validation (e.g., z.string(), z.number(), z.object({...}))

IMPORTANT STRATEGY:
When facing complex tasks, DO NOT implement complex algorithms or use unavailable libraries.
Instead, leverage the POWER OF LLM by delegating to other AI functions via v.

Examples:
- For "emoji to ASCII art": return await v[\`将\${args[0]}转化为\${args[1] || 100}x\${args[2] || 100}字符画\`]()(z.string());
- For "complex data processing": break into steps using v.step1(), v.step2(), etc.
- For "creative tasks": delegate to descriptive function names that LLM can understand
- For "format conversions": use v[\`convert \${format} to \${targetFormat}\`](data)

Think: Can LLM generate this directly? If yes, use v! Don't write complex code.

IMPORTANT: Return ONLY executable code WITHOUT function declaration.
Good: return args[0] + args[1];
Bad: function add(args) { return args[0] + args[1]; }`;

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
   * 清理代码（移除 markdown 标记和函数声明）
   */
  private cleanCode(code: string): string {
    // 移除可能的 markdown 代码块标记
    code = code
      .replace(/^```(?:typescript|ts|javascript|js)?\s*\n/i, '')
      .replace(/\n```$/, '')
      .trim();
    
    // 移除函数声明包装
    // 匹配: function name(...) { ... } 或 async function name(...) { ... }
    const funcDeclMatch = code.match(/^(?:async\s+)?function\s+\w*\s*\([^)]*\)\s*\{([\s\S]*)\}$/);
    if (funcDeclMatch) {
      return funcDeclMatch[1].trim();
    }
    
    // 匹配箭头函数: (...) => { ... } 或 (...) => ...
    const arrowFuncMatch = code.match(/^\([^)]*\)\s*=>\s*\{([\s\S]*)\}$/);
    if (arrowFuncMatch) {
      return arrowFuncMatch[1].trim();
    }
    
    return code;
  }
}
