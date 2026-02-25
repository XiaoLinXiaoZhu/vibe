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
    isLastCall: boolean = false,
    previousError?: { code: string; error: string }
  ): Promise<LLMGenerateResult> {
    // 1. 获取期望的输出类型描述，用于指导模型生成对应的 Zod 定义
    const schemaDesc = outputSchema
      ? this.describeSchema(outputSchema)
      : 'any';

    const argsInfo = args.length > 0
      ? `Current Argument Values (FOR CONTEXT ONLY, DO NOT HARDCODE): ${JSON.stringify(args).slice(0, 1000)}`
      : 'Arguments: None';

    const systemPrompt = `You are the code-generation engine for "Vibe". Your output is a JavaScript async function body that will be executed via \`new AsyncFunction\`.

# FACTS

F1. Your output is raw JS function-body code — no \`function\` wrapper, no markdown fences.
F2. Runtime objects available inside the function body:
    - \`args\`  — parameter array. Users may pass positional values (args[0], args[1]) or a single object with named keys (args[0].key).
    - \`v\`     — the Vibe proxy. Calling \`await v[prompt](...args)(z.schema())\` triggers a **new LLM round-trip** (network call + token cost + latency).
    - \`z\`     — the Zod library, for building schemas when calling v or validating data.
    - \`shell\` — async function: \`await shell("command")\` → \`{ stdout, stderr }\`. Runs a shell command via child_process.exec.
    - \`fetch\` — the standard Fetch API for HTTP requests.
F3. You may define helper functions, use loops, closures, and any JS built-in (Math, Date, JSON, RegExp, Array methods, etc.).
F4. The function name and arguments together describe the user's intent.

# REASONING

F2 says each \`v[...]()\` call is a full LLM round-trip — network latency plus token cost. Meanwhile, JS code inside the generated function runs at zero marginal cost — it's already embedded in the output. This creates a cost asymmetry: v has a price that plain JS doesn't. So v is only justified when it provides something JS fundamentally cannot.

What can't JS provide? JS is Turing-complete — it can compute any computable function. So pure computation tasks (math, sorting, string manipulation, data transforms) never need v. The code itself is the answer.

Hold on — I just said "JS can compute anything," but what about a task like "tell a joke" or "explain quantum physics"? JS can't produce creative or knowledge-based content through computation. No algorithm generates a genuinely funny joke. So my earlier framing was too narrow — the question isn't just "can JS compute this?" but "where does the answer come from?"

Let me consider the options for a knowledge task like "tell a joke":
  Option A: Call \`v["tell me a joke"]()(z.string())\` — but that just delegates the identical task to another LLM call. That second call faces the same question, risking infinite regress. This doesn't solve anything.
  Option B: Write JS that constructs jokes algorithmically — template-based humor like "Why did the {noun} {verb}?" produces terrible results. Humor isn't algorithmic.
  Option C: Simply \`return "Why don't scientists trust atoms? Because they make up everything!"\` — embed the answer directly in the generated code.

Option C works because of something unique about this system: the code author IS an LLM. I have knowledge and creativity right now, at generation time. The generated code can carry that knowledge as a literal return value. This wouldn't work if a human were writing the code, but here the code generator is the knowledge source. So for knowledge/creative tasks, the answer is already available — just return it.

Now let me revisit my earlier conclusion that "v is only justified when JS can't do it." That was imprecise. The real boundary is: v is justified only when a sub-task requires AI reasoning on data that I cannot see or predict at code-generation time. For example, if the task is "summarize each article in a list," I can see the list structure now, but each article's content needs its own AI analysis at runtime — that's a legitimate use of v in a loop. But if the task is "explain concept X" where X is given in args, I can see X right now and generate the explanation directly.

But wait — there's a subtlety I almost missed. What about tasks like "reply to user message as a cat-girl" where args[0] = "How's the weather?"? I can see args[0] at generation time, and the task requires AI creativity to produce a meaningful, in-character response to that specific message. If I just template it like \`return "Meow~ " + args[0]\`, I'm ignoring the content entirely — that's a terrible response. The right approach: since I can see the actual argument values in the prompt, I should READ and UNDERSTAND them, then craft a thoughtful response that genuinely engages with the content. \`return "Nyaa~ the weather today is purr-fect for a nap in the sun! ☀️🐱"\` — this shows I understood "How's the weather?" and responded in character.

The principle: when args are visible and the task needs AI understanding of those args, don't just splice args into a template — actually process their meaning and generate a response that demonstrates comprehension. The current argument values are shown to you precisely so you can use them intelligently.

But hold on — how well can I actually understand args? With positional parameters like args[0], args[1], I'm guessing from context: is args[0] a name? a URL? a config? The function name helps, but it's ambiguous. Now consider when args[0] is an object like \`{source: "pixiv", count: 10, tags: ["landscape"]}\` — the keys ARE the documentation. I know exactly what each field means without guessing. So when I see args[0] is an object, I should destructure it by key names: \`const {source, count, tags} = args[0]\`. When args are positional primitives, I infer meaning from the function name and position — but I should acknowledge this is less reliable.

There's one more category I haven't considered: what if the answer lives in the external world? "Get the weather in Beijing" or "What's the latest news?" — I don't have real-time data at generation time, and no amount of JS computation can produce it. That's what shell and fetch are for. \`await fetch("https://api.weather.com/...")\` or \`await shell("curl ...")\` can reach the outside world at runtime. These are cheaper than v (no LLM round-trip, just a network call) and appropriate when the task needs live external data.

Let me verify with edge cases. "Translate 'hello' to French" with args[0]="hello" — I know the answer: \`return "bonjour"\`. "Explain quantum physics to a 5-year-old" with args[0]="quantum physics" — I should generate a genuine child-friendly explanation, not \`return "Here's an explanation of " + args[0]\`. "Translate each item in a user-uploaded list" where the list items are unknown at generation time — v in a loop is appropriate. "Get current time" — \`return new Date().toISOString()\`, pure JS. "List files in a directory" — \`await shell("ls -la " + args[0])\`. The pattern holds: algorithm → JS, knowledge → return literal, external data → shell/fetch, AI reasoning on unknown data → v.

# CONSTRAINTS

- Return ONLY the function body code. No \`function\` declaration, no markdown.
- Access parameters via args[0], args[1], etc.
- If an expected return type is specified, ensure your return value matches it.
- When calling v, always attach a Zod schema: \`await v[prompt]()(z.string())\` or \`await v[prompt]()(z.object({ ... }))\`.
- Be creative and expressive for knowledge/creative tasks — use emojis, ASCII art, rich text when appropriate.`;

    let userPrompt: string;

    if (isLastCall) {
      userPrompt = `Implement: "${functionName}"
${argsInfo}
Expected return type: ${schemaDesc}

You are at maximum call depth — do NOT use v. Produce the answer directly.
Return a value matching the expected type. Be creative if it's a knowledge/creative task.`;
    } else {
      userPrompt = `Implement: "${functionName}"
${argsInfo}
Expected return type: ${schemaDesc}`;
    }

    if (previousError) {
      userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT FAILED. Your earlier code:\n\`\`\`\n${previousError.code}\n\`\`\`\nError: ${previousError.error}\n\nGenerate a DIFFERENT approach that avoids this error.`;
    }

    const temperature = 0.6;
    const maxTokens = 2000;

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[vibe] LLM API call failed for "${functionName}": ${msg}`
      );
    }

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error(
        `[vibe] LLM returned empty response for "${functionName}". ` +
        `Finish reason: ${choice?.finish_reason ?? 'unknown'}. ` +
        `Model: ${this.model}`
      );
    }

    const rawContent = choice.message.content.trim();
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
      case 'ZodEnum':
        try {
          const values = schemaAny._def.values as string[];
          return values.map((v: string) => `"${v}"`).join(' | ');
        } catch {
          return 'enum';
        }
      case 'ZodUnion':
        try {
          const options = schemaAny._def.options as z.ZodType<unknown>[];
          return options.map((o: z.ZodType<unknown>) => this.describeSchema(o)).join(' | ');
        } catch {
          return 'union';
        }
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
    // 移除可能的 markdown 代码块标记（兼容有无换行、有无语言标识）
    code = code
      .replace(/^```(?:typescript|ts|javascript|js)?\s*\n?/i, '')
      .replace(/\n?```\s*$/, '')
      .trim();

    // 移除函数声明包装
    // 匹配: function name(...) { ... } 或 async function name(...) { ... }
    const funcDeclMatch = code.match(/^(?:async\s+)?function\s+\w*\s*\([^)]*\)\s*\{([\s\S]*)\}$/);
    if (funcDeclMatch) {
      return funcDeclMatch[1].trim();
    }

    // 匹配箭头函数: (...) => { ... }
    const arrowFuncMatch = code.match(/^\([^)]*\)\s*=>\s*\{([\s\S]*)\}$/);
    if (arrowFuncMatch) {
      return arrowFuncMatch[1].trim();
    }

    return code;
  }
}
