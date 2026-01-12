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
    // 生成更友好的 schema 描述
    const schemaDescription = outputSchema
      ? `\nOutput type: ${this.describeSchema(outputSchema)}\nThe output MUST match this type.`
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

Implementation guide - Generate concrete output:
• ASCII art/Character art: Create actual visual patterns with characters
• Text generation: Use template literals and string methods
• Data structures: Build objects/arrays with real values
• Math/Logic: Calculate directly

For ASCII art specifically:
• Use simple characters: *, o, O, -, |, +, #, etc.
• Create recognizable shapes and patterns
• Use proper spacing and newlines (\\n)

Examples:
1. Eyes ASCII art (for 👀, 20x20):
   const lines = [];
   lines.push("    oooo    oooo    ");
   lines.push("   o    o  o    o   ");
   lines.push("   o  * o  o  * o   ");
   lines.push("    oooo    oooo    ");
   return lines.join("\\n");

2. Heart ASCII art:
   return \`  **   **  \\n **** **** \\n***********\\n **********\\n  ******  \`;

3. Generate profile:
   return { name: args[0] || "User", age: args[1] || 25, email: \`\${(args[0] || "user").toLowerCase()}@example.com\` };`;
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

✅ WHEN TO IMPLEMENT DIRECTLY (Preferred - more efficient):
   • ASCII art / Character art - Use simple characters (*, o, -, |) to draw shapes
   • Pattern generation - Create visual patterns with loops and string operations
   • Text formatting - Use template literals and string methods
   • Basic math - Calculate directly
   • Data structures - Build objects/arrays with concrete values
   • Simple transformations - String ops, array methods
   
   Examples:
   • const rows = []; for(let i=0; i<10; i++) rows.push("o o"); return rows.join("\\n"); // Eyes
   • return args[0] + args[1]; // Math
   • return { name: args[0], age: args[1] }; // Object

⚠️ WHEN TO USE **v** (Only for truly complex tasks):
   • Multi-step workflows needing decomposition into different specialized tasks
   • Tasks requiring external knowledge you don't have (rare)
   • When specific sub-problems are clearer than the whole
   
   ⚠️ CRITICAL: Always pass arguments!
   • ✅ await v[\`process \${args[0]} data\`](args[0], args[1])(z.string())
   • ❌ await v[\`process \${args[0]} data\`]()(z.string()) // args not passed!
   
   Examples (use sparingly):
   • const data = await v.fetchExternalData(args[0])(z.object({...})); return data.value;
   • const part1 = await v.complexCalculation(args[0])(z.number()); return part1 * 2;

⛔ CRITICAL RULE - NEVER CALL YOURSELF:
   • Current function: "${functionName}"
   • FORBIDDEN: v.${functionName}(...), v["${functionName}"](...), v[\`${functionName}...\`](...)
   • FORBIDDEN: Semantically similar calls (e.g., "drawHeart" → "draw a heart")
   • This causes infinite recursion!

✅ GOOD Patterns:
   // Direct ASCII art implementation
   const lines = ["  o o  ", " o   o ", "  o o  "];
   return lines.join("\\n");
   
   // Simple math
   return args[0] * 2;
   
   // Delegation WITH args (if really needed)
   const result = await v.complexTask(args[0], args[1])(z.string());
   return result;

❌ BAD Patterns:
   return await v.${functionName}(args[0]); // SELF LOOP!
   return await v["${functionName}"](args); // SELF LOOP!
   return await v[\`task \${args[0]}\`]()(z.string()); // Missing args parameter!
   return await v.drawSomething()(z.string()); // Should implement directly!

💡 Best Practices:
   • Include concrete values: v[\`处理\${args[0]}\`]() ✓ not v["处理数据"]() ✗
   • Always add Zod schema: (z.string()), (z.number()), (z.object({...}))
   • Delegate creative tasks even if they seem "simple" - LLM is better at them`;
    }
    
    const userPrompt = `Generate a JavaScript function body for: "${functionName}"
Arguments: ${args.length > 0 ? JSON.stringify(args) : 'None'}${schemaDescription}
${strategyGuidance}

📋 Code Requirements:
- Access arguments via args array: args[0], args[1], etc.
- Return the result directly (use 'return' statement)
- Async/await is supported
- Write robust code: check bounds, handle edge cases, use safe operators
- DO NOT include function declaration wrapper
- DO NOT include markdown code fences

✅ GOOD examples:
   return args[0] + args[1];
   return \`Hello \${args[0]}\`;
   const char = line[x] || ' '; // Safe: handle undefined
   const result = args[0] * 2; return result;

❌ BAD examples:
   function ${functionName}(args) { return args[0]; }  // NO function wrapper!
   \`\`\`javascript ... \`\`\`  // NO markdown!
   const char = line[x]; char.repeat(2); // Unsafe: char might be undefined!

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
