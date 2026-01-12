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

```typescript
v.add(5, 3);
v.加法(5, 3);
v.将emoji转化为字符画("👀", "200", "200");
```

#### 附带类型参数（使用 zod 来验证输出类型）：

```typescript
// 使用链式调用，第二个括号传入 zod schema
v.add(5, 3)(z.number());

// 或者使用 .withSchema 方法
v.add(5, 3).withSchema(z.number());
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
3. 支持 `v.函数名(参数)` 和 `v.函数名(参数)(schema)` 两种调用方式。
4. 缓存时，同时检查函数名、参数类型、输出类型（若有）是否相同，若相同，则使用缓存。
5. 使用 zod 支持控制输出类型，该部分会传递给 LLM，从而控制输出类型。
6. 可选 strict 模型，该模式下，vibe 会严格检查输出类型，若不匹配，则抛出错误。
7. 使用 openai 提供的 api 而不是自己实现，从而保证兼容性。
8. 日志记录：每次函数调用都会记录到 `.vibe/logs` 目录，包含完整的 LLM 请求、响应、生成的代码、执行时间等信息。