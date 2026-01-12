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
  // 1. 构建精简的 Schema 描述
  const schemaDesc = outputSchema
    ? `\nExpected Return Type: ${this.describeSchema(outputSchema)}`
    : '';

  // 2. 构建参数摘要，帮助模型判断是否是直接 Prompt
  const argsDesc = args.length > 0 
    ? `Arguments: ${JSON.stringify(args).slice(0, 1000)}` // 截断过长参数避免 Token 浪费
    : 'Arguments: None';

  // 3. System Prompt: 定义环境、人格和边界
  // 重点：强调 "有趣" 和 "Native Execution" (直接执行)
  const systemPrompt = `You are the AI engine for 'Vibe', a runtime that executes JavaScript generated on-the-fly.

GLOBAL CONTEXT (Available in your code):
1. args: Array of inputs (args[0], args[1]...).
2. z: Zod library for validation.
3. v: The Vibe instance for recursive AI calls.
 - Syntax: await v.func(arg)(z.type()) or await v["prompt"]()(z.type())
 - COST WARNING: Calling 'v' triggers a new LLM bill. Avoid if possible.

CORE PHILOSOPHY:
1. ⚡️ NATIVE FIRST: If you (the LLM) know the result or logic, implement it DIRECTLY in JavaScript.
 - Example: v["What is 1+1"]() -> return 2; (Don't call v.add)
 - Example: v["Tell a joke"]() -> return "Why did the chicken..."; (Don't call v.generateJoke)
 - ONLY call 'v' for: Complex multi-step reasoning, browsing, or when you explicitly need a sub-agent.
2. 🎨 FUN > FUNCTIONAL: Unless strictly logical (math/data), prefer creative, entertaining outputs. Use emojis, ASCII art, or randomization.
3. 🛡️ ROBUST: Handle undefined args safely.

CONSTRAINT: Return ONLY the function body code. No markdown, no wrappers.`;

  // 4. User Prompt: 动态构建任务
  // 区分 "最后一次调用" 和 "普通调用"
  let specificInstruction = '';

  if (isLastCall) {
    specificInstruction = `
⚠️ MAX RECURSION REACHED.
You MUST return a value directly using pure JavaScript.
DO NOT call 'v' again.
- If asking for a prompt/question: Answer it directly as a string.
- If creative: Return a random selection from an array or a template string.
- If logical: Calculate it.`;
  } else {
    specificInstruction = `
Task: Implement function "${functionName}"
${argsDesc}${schemaDesc}

GUIDANCE:
- If "${functionName}" looks like a prompt/question (e.g. "write a poem", "translate this"), ANSWER IT directly in the returned code string.
- If it implies a visual (e.g. "draw"), return ASCII art.
- If it allows variation, use Math.random() to be unpredictable and fun.
- Use 'await v' ONLY if the task is too complex for a single function body.`;
  }

  const userPrompt = `${specificInstruction}`;

  const temperature = 0.6; // 稍微调高温度以增加趣味性
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
