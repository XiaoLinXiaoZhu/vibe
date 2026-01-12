## 项目概述

这是一个娱乐项目，使用 LLM 来生成函数实现，并且将其作为函数执行。

注意，该库为娱乐项目，不保证其安全性，请勿用于生产环境。

### 目标使用方式：

#### 初始化：
```typescript
import {vibe} from 'vibe'

const v = new vibe(vibeconfig);
```

#### 普通函数调用：

它具有以下特性：
1. 任何函数和任何参数都可以，vibe 会调用 LLM 生成 JavaScript 代码，并且将其作为函数实现执行。
2. 每个函数都是纯函数，不会修改任何外部状态。
3. vibe 拥有缓存（.vibe/cache），可以缓存函数实现，从而同一函数在多次调用时，不会重复调用 LLM。

```typescript
v.anyFunctionName(anyargs);
```

#### 附带类型参数（使用 zod 来验证输出类型）：

```typescript
// 使用 withSchema 方法指定函数和参数的类型
v.anyFunctionName(anyargs)(zodSchema);  // 返回 zodSchema 的类型
```

#### 使用装饰器（运行时会自动修改函数实现）：
```typescript
@vibeFn
function anyFunctionName(anyargs) {
    return;
}
```

### 实现细节：

1. LLM 生成的是 JavaScript 代码（可直接执行），类型安全由 Zod schema 提供，不依赖 TypeScript 编译。
2. 缓存时，同时检查函数名、参数类型、输出类型（若有）是否相同，若相同，则使用缓存。
3. 使用 zod 支持控制输出类型，该部分会传递给 LLM，从而控制输出类型。
4. 可选 strict 模型，该模式下，vibe 会严格检查输出类型，若不匹配，则抛出错误。
5. 使用 openai 提供的 api 而不是自己实现，从而保证兼容性。
6. 日志记录：每次函数调用都会记录到 `.vibe/logs` 目录，包含完整的输入、输出、生成的代码、执行时间等信息。