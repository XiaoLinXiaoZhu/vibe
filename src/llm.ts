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
      // 最后一次调用，必须直接生成结果，不提及v和z避免混淆
      strategyGuidance = `\n\n⚠️ CRITICAL: Maximum recursion depth reached.
You MUST generate the actual result DIRECTLY using pure JavaScript:
- Implement the logic yourself, DO NOT delegate
- Return concrete output, not placeholders
- Use built-in JavaScript features only

Implementation guide:
• Text/String tasks: Use template literals, string methods, concatenation
• ASCII art: Return multiline string with actual characters
• Data generation: Create objects/arrays with concrete values
• Math/Logic: Implement calculations directly
• Creative content: Generate based on function name semantics and arguments

Examples:
1. Draw ASCII heart:
   return \`  ♥♥   ♥♥  \\n ♥♥♥♥ ♥♥♥♥ \\n♥♥♥♥♥♥♥♥♥\\n ♥♥♥♥♥♥♥  \\n  ♥♥♥♥♥   \`;

2. Get age:
   return 25;

3. Generate profile:
   return { name: args[0] || "User", age: args[1] || 25, email: \`\${(args[0] || "user").toLowerCase()}@example.com\` };

4. Convert emoji to ASCII (20x20):
   const rows = [];
   for (let i = 0; i < 20; i++) {
     rows.push("* ".repeat(20));
   }
   return rows.join("\\n");`;
    } else {
      // 非最后一次调用，详细说明v和z
      strategyGuidance = `\n\n📦 Available Global Objects:

1. **v** - AI Function Caller (Vibe instance)
   - Dynamically calls LLM to generate and execute functions
   - Usage: v.functionName(args) or v["function name"](args)
   - Returns a callable that accepts optional Zod schema for validation
   - Example: await v.helperTask(data)(z.string())
   - ⚠️ Each call triggers a new LLM generation (expensive!)

2. **z** - Type Validation (from 'zod' library)
   - Schema definition and runtime validation
   - Common types: z.string(), z.number(), z.boolean(), z.array(), z.object()
   - Use with v calls to ensure type safety: v.task()(z.number())

3. **args** - Input arguments array
   - Access via: args[0], args[1], args[2], etc.

🎯 STRATEGY - Choose Wisely:

✅ WHEN TO USE **v** (Delegate to LLM):
   • Complex multi-step workflows needing decomposition
   • Tasks requiring different specialized capabilities (e.g., format conversion, creative generation)
   • When breaking down into clear, well-defined sub-tasks adds value
   
   Example: await v[\`convert emoji \${args[0]} to unicode\`]()(z.string())

❌ WHEN TO IMPLEMENT DIRECTLY (No v):
   • Simple, concrete tasks solvable with basic JavaScript
   • Pure computations (math, string ops, array manipulation)
   • Direct output generation (ASCII art, simple text, numbers)
   • Tasks that would create semantic loops
   
   Example: return args[0] + args[1]; // Just do it!

⛔ CRITICAL RULE - NEVER CALL YOURSELF:
   • Function name: "${functionName}"
   • FORBIDDEN: v.${functionName}(...), v["${functionName}"](...), v[\`${functionName}...\`](...)
   • FORBIDDEN: Semantically similar names (e.g., "drawHeart" → "draw a heart")
   • Self-loops cause infinite recursion!

✅ GOOD Patterns:
   return "❤️".repeat(args[0]); // Direct
   const part = await v.subtaskA(args[0])(z.string()); return part.toUpperCase(); // Real decomposition

❌ BAD Patterns:
   return await v.${functionName}(args[0]); // SELF LOOP!
   return await v["${functionName}"](args); // SELF LOOP!
   return await v["vague similar task"](); // Unclear recursion

💡 Best Practices for v delegation:
   • Include concrete values: v[\`process \${args[0]}\`]() ✓ vs v["process data"]() ✗
   • Always add Zod schema: v.task(value)(z.string()) for type safety
   • Make sub-tasks genuinely different from current task`;
    }
    
    const userPrompt = `Generate a JavaScript function body for: "${functionName}"
Arguments: ${args.length > 0 ? JSON.stringify(args) : 'None'}${schemaDescription}
${strategyGuidance}

📋 Code Requirements:
- Access arguments via args array: args[0], args[1], etc.
- Return the result directly (use 'return' statement)
- Async/await is supported
- DO NOT include function declaration wrapper
- DO NOT include markdown code fences

✅ GOOD examples:
   return args[0] + args[1];
   return \`Hello \${args[0]}\`;
   const result = args[0] * 2; return result;

❌ BAD examples:
   function ${functionName}(args) { return args[0]; }  // NO function wrapper!
   \`\`\`javascript ... \`\`\`  // NO markdown!

⚠️  Return ONLY the executable function body code.`;

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
