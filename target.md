## 项目概述

这是一个娱乐项目，使用 LLM 来生成函数实现，并且将其作为函数执行。

注意，该库为娱乐项目，不保证其安全性，请勿用于生产环境。

### 目标使用方式：

#### 初始化：
```typescript
import { createVibe } from 'vibe';

const v = createVibe(config);
```

#### 普通函数调用：

1. 任何函数和任何参数都可以，vibe 会调用 LLM 生成 JavaScript 代码，并且将其作为函数实现执行。
2. `v` 下面所有的属性都是 AI 函数，包括中文函数名。
3. 每个函数都是纯函数，不会修改任何外部状态。
4. vibe 拥有缓存（.vibe/cache），可以缓存函数实现，从而同一函数在多次调用时，不会重复调用 LLM。
5. 支持点号和方括号两种调用方式，方括号方式支持动态函数名。
6. **AI 生成的代码可以调用其他 AI 函数**，实现复杂功能的分解和组合。

```typescript
// 点号调用
v.add(5, 3);
v.加法(5, 3);
v.将emoji转化为字符画("👀", "200", "200");

// 方括号调用
v["add"](5, 3);
v["加法"](5, 3);

// 动态函数名
const funcName = "multiply";
v[funcName](6, 7);

// 特殊字符或空格的函数名
v["calculate total price"](100, 0.2);

// AI 生成的代码可以调用其他函数（函数组合）
// 例如：v.将emoji转化为字符画() 的实现可能会调用其他辅助函数：
// await v.getEmojiUnicode(args[0])
// await v.generateASCIIArt(unicode, args[1], args[2])
```

#### 附带类型参数（使用 zod 来验证输出类型）：

```typescript
// 点号调用 + 链式调用，第二个括号传入 zod schema
v.add(5, 3)(z.number());

// 方括号调用 + 链式调用
v["add"](5, 3)(z.number());

// 使用 .withSchema 方法（点号）
v.add(5, 3).withSchema(z.number());

// 使用 .withSchema 方法（方括号）
v["add"](5, 3).withSchema(z.number());
```

#### 使用装饰器（运行时会自动修改函数实现）：

```typescript
@VibeClass()
class Calculator {
  @vibeFn
  multiply(a: number, b: number): any {
    return;
  }
}
```

#### 全局对象（AI 代码中可用）：

AI 生成的代码在执行时可以访问以下全局对象：

1. **`v`**：当前 vibe 实例，可以调用其他 AI 函数
2. **`z`**：zod 库，用于类型验证和 schema 定义
3. **`args`**：参数数组，包含调用时传入的所有参数

```typescript
// AI 可能生成这样的代码来实现复杂功能：

// 示例 1: 调用其他 AI 函数
const result1 = await v.helperFunction(args[0]);
const result2 = await v.anotherFunction(result1, args[1]);
return result2;

// 示例 2: 使用 zod 进行验证
const validated = z.number().parse(args[0]);
return validated * 2;

// 示例 3: 函数组合 + 类型验证
const data = await v.fetchData(args[0])(z.object({ 
  name: z.string() 
}));
return await v.processData(data)(z.string());

// 示例 4: 动态函数调用
const funcName = `process${args[0]}`;
return await v[funcName](args[1], args[2]);
```

#### 实用方法：

预定义方法（清除缓存、读取日志等）通过 `vibeUtils` 对象提供：

```typescript
await vibeUtils.clearCache();
const logs = await vibeUtils.readLogs();
await vibeUtils.clearLogs();
```

### 实现细节：

1. LLM 生成的是 JavaScript 代码（可直接执行），类型安全由 Zod schema 提供，不依赖 TypeScript 编译。
2. `createVibe()` 返回一个纯 Proxy，所有属性访问都被当作 AI 函数调用。
3. 支持多种调用方式：
   - `v.函数名(参数)` / `v["函数名"](参数)`
   - `v.函数名(参数)(schema)` / `v["函数名"](参数)(schema)`
   - `v.函数名(参数).withSchema(schema)` / `v["函数名"](参数).withSchema(schema)`
4. 方括号调用支持动态函数名和特殊字符。
5. **全局对象支持**：AI 生成的代码可以访问：
   - `v`：vibe 实例，可调用其他 AI 函数实现函数组合
   - `z`：zod 库，可在生成的代码中进行类型验证
   - `args`：参数数组，通过 `args[0]`, `args[1]` 访问
6. **函数组合**：AI 可以生成调用其他 AI 函数的代码，实现复杂功能的分解和组合。例如：
   ```javascript
   // AI 生成的代码可以这样写：
   const helper = await v.helperFunction(args[0]);
   return await v.processResult(helper)(z.string());
   ```
7. 缓存时，同时检查函数名、参数类型、输出类型（若有）是否相同，若相同，则使用缓存。
8. 使用 zod 支持控制输出类型，该部分会传递给 LLM，从而控制输出类型。
9. 可选 strict 模型，该模式下，vibe 会严格检查输出类型，若不匹配，则抛出错误。
10. 使用 openai 提供的 api 而不是自己实现，从而保证兼容性。
11. 日志记录：每次函数调用都会记录到 `.vibe/logs` 目录，包含完整的 LLM 请求、响应、生成的代码、执行时间等信息。