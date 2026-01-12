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
    // 1. 获取期望的输出类型描述，用于指导模型生成对应的 Zod 定义
    const schemaDesc = outputSchema
      ? this.describeSchema(outputSchema)
      : 'any';

    const argsInfo = args.length > 0
      ? `Current Argument Values (FOR CONTEXT ONLY, DO NOT HARDCODE): ${JSON.stringify(args).slice(0, 1000)}`
      : 'Arguments: None';

    const systemPrompt = `You are the AI engine for 'Vibe'. You generate JavaScript code to execute functions.

GLOBAL VARIABLES:
1. args: Array of inputs.
2. z: Zod library. CRITICAL: Use for output validation.
3. v: The Vibe instance.
 - Syntax: await v[prompt]()(z.schema)
 - ⚠️ ALWAYS append (z.schema) when calling v!

⚡️ STRATEGY - CHOOSE ONE PATH:

PATH A: PURE LOGIC / NATIVE JS (Use this when possible)
 - Math, array manipulation, randomness, simple patterns.
 - ✅ GOOD: return args[0] + args[1];

PATH B: DIRECT KNOWLEDGE (Only if NO args or args are config)
 - If the function name ITSELF is the prompt (e.g. v["Tell a joke"]()) AND args are empty/irrelevant.
 - Return the content directly.
 - Be creative, use emojis and ASCII art!

PATH C: DYNAMIC DELEGATION (CRITICAL for "Explain X", "Translate Y")
 - If the task requires AI intelligence applied to specific 'args'.
 - DO NOT implement the content yourself (avoid hardcoding).
 - Construct a prompt string and delegate to 'v'.
 - ⚠️ MUST define the return type using 'z' to match expectations!
 
 ✅ GOOD EXAMPLE:
   const prompt = \`Explain \${args[0]} in \${args[1]} style\`;
   // Notice the (z.string()) at the end:
   return await v[prompt]()(z.string()); 

 ✅ COMPLEX EXAMPLE (Expect Object):
   const prompt = \`Analyze \${args[0]}\`;
   // Define schema to match expected output:
   return await v[prompt]()(z.object({ sentiment: z.string(), score: z.number() }));

CONSTRAINT: Return ONLY the function body code.`;

    let specificInstruction = '';

    if (isLastCall) {
      specificInstruction = `
⚠️ MAX RECURSION.
- Answer the specific question (e.g. "${functionName}") DIRECTLY.
- Return a value matching type: ${schemaDesc}
- Be funny, use ASCII art if returning string.
- DO NOT use 'v' again.`;
    } else {
      specificInstruction = `
Task: Implement "${functionName}"
${argsInfo}
Expected Return Type: ${schemaDesc}

DECISION GUIDE:
1. Is "${functionName}" a specific command requiring AI knowledge about 'args[0]'?
 -> YES: Use PATH C. 
 -> Construct dynamic prompt: \`${functionName} \${args[0]}...\`
 -> Delegate with Schema: await v[prompt]()(z.${schemaDesc === 'any' ? 'string' : schemaDesc}()); 

2. Is "${functionName}" a complete prompt itself (args are empty)?
 -> YES: Use PATH B. Return content directly.

3. Is it simple logic?
 -> YES: Use PATH A.
`;
    }

    const userPrompt = `${specificInstruction}`;

    const temperature = 0.6;
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
   * 将 Zod schema 转换为易读的描述
   */
  private describeSchema(schema: z.ZodType<unknown>): string {
    const schemaAny = schema as any;
    const typeName = schemaAny._def?.typeName;

    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodDate':
        return 'Date';
      case 'ZodArray':
        try {
          const elementType = this.describeSchema(schemaAny._def.type);
          return `${elementType}[]`;
        } catch {
          return 'array';
        }
      case 'ZodObject':
        try {
          const shape = schemaAny._def.shape();
          const props = Object.entries(shape)
            .map(([key, value]) => `${key}: ${this.describeSchema(value as z.ZodType<unknown>)}`)
            .join(', ');
          return `{ ${props} }`;
        } catch {
          return 'object';
        }
      case 'ZodUnion':
      case 'ZodEnum':
        return 'union';
      case 'ZodOptional':
        try {
          return `${this.describeSchema(schemaAny._def.innerType)}?`;
        } catch {
          return 'optional';
        }
      case 'ZodNullable':
        try {
          return `${this.describeSchema(schemaAny._def.innerType)} | null`;
        } catch {
          return 'nullable';
        }
      default:
        return 'any';
    }
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
