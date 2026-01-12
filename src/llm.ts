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
   * @param isLastCall 是否是最后一次调用（达到最大深度）
   */
  async generateFunctionCode(
    functionName: string,
    args: unknown[],
    outputSchema?: z.ZodType<unknown>,
    isLastCall: boolean = false
  ): Promise<LLMGenerateResult> {
    const schemaDescription = outputSchema
      ? `\nOutput schema: ${JSON.stringify(outputSchema)}\nThe output MUST satisfy this schema.`
      : '';

    const systemPrompt = 'You are a JavaScript expert. Generate clean, efficient JavaScript code. Return ONLY the function code, no markdown, no backticks.';
    
    let strategyGuidance = '';
    if (isLastCall) {
      // 最后一次调用，不能再使用 v
      strategyGuidance = `\n\nCRITICAL: This is the FINAL call. You MUST generate the actual result directly.
- DO NOT call v (not available)
- Generate deterministic, concrete output based on the function name and any arguments
- Extract information from the function name itself (e.g., "generate profile for Alice age 25")
- If args is empty, parse the function name for values
- Return actual values, not placeholders

Example for "${functionName}":
${args.length === 0 ? `// Parse function name: "${functionName}"
// Extract: name, age, or other info from the function name
const nameMatch = "${functionName}".match(/Alice|Bob|user named (\\w+)/i);
const ageMatch = "${functionName}".match(/(\\d+) years old|age (\\d+)/i);
const name = nameMatch ? (nameMatch[1] || nameMatch[0]) : "User";
const age = ageMatch ? parseInt(ageMatch[1] || ageMatch[2]) : 25;

return {
  name: name,
  age: age,
  email: \`\${name.toLowerCase()}@example.com\`,
  bio: \`I am \${name}, \${age} years old\`,
  id: \`user_\${Date.now()}\`,
  createdAt: new Date().toISOString()
};` : `// Use provided arguments
return {
  name: args[0],
  age: args[1],
  email: \`\${args[0].toLowerCase()}@example.com\`,
  bio: \`I am \${args[0]}, \${args[1]} years old\`
};`}`;
    } else {
      // 非最后一次调用，可以使用 v
      strategyGuidance = `\n\nAvailable global objects:
- v: vibe instance for calling other AI functions
- z: zod library for schema validation

STRATEGY - Use LLM Power Wisely:
1. For tasks LLM can solve directly (creative, text generation, format conversion):
   → Delegate with SPECIFIC, DETERMINISTIC instructions
   → Good: await v[\`generate email for \${args[0]} age \${args[1]}\`]()(z.string())
   → Bad: await v["generate random user data"]()(schema) // too vague!

2. Always include CONTEXT in delegated calls:
   → Include actual values: await v[\`create bio for Alice who is 25 years old\`]()
   → Not just types: await v["create bio"](args[0], args[1])

3. Use schema validation with delegated calls:
   → await v[\`generate JSON with name and age for \${args[0]}\`]()(z.object({name: z.string(), age: z.number()}))

4. For simple logic (math, string ops): implement directly
   → return args[0] + args[1];
   → return args[0].toUpperCase();

Examples:
✓ await v[\`convert emoji \${args[0]} to \${args[1]}x\${args[2]} ASCII art\`]()(z.string())
✓ await v[\`generate email address for user named \${args[0]}\`]()(z.string())
✗ await v["generate random data"]()(schema) // will cause infinite loop!`;
    }
    
    const userPrompt = `Generate a JavaScript function for "${functionName}".
Arguments: ${args.length > 0 ? JSON.stringify(args) : 'None'}${schemaDescription}

Requirements:
- Access arguments via args array: args[0], args[1], etc.
- Return the result directly
- Use JavaScript/async syntax (await is supported)
- DO NOT wrap code in function declaration
- Return ONLY the function body code${strategyGuidance}

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
