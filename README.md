# Vibe

一个使用 LLM 动态生成函数实现的 TypeScript 库。这是一个娱乐项目，不保证安全性，请勿用于生产环境。

## 特性

- 🚀 **动态生成**: 使用 LLM 自动生成 JavaScript 函数实现
- 💾 **智能缓存**: 自动缓存函数实现，避免重复调用 LLM
- 🔒 **类型安全**: 支持 Zod 进行输出类型验证（不依赖 TypeScript）
- 🎯 **灵活调用**: 支持普通函数调用、带类型验证调用、装饰器使用
- 🌍 **中文支持**: 支持中文函数名和参数
- 📊 **完整日志**: 记录所有 LLM 调用的请求和响应
- ⚙️ **可配置**: 支持环境变量和自定义配置

## 安装

```bash
bun install
```

## 配置

创建 `.env` 文件（参考 `.env.example`）：

```env
LLM_API_KEY=your-api-key-here
LLM_MODEL=gpt-4
LLM_BASE_URL=https://api.openai.com/v1
CACHE_DIR=.vibe/cache
STRICT=false
```

## 使用方式

### 1. 使用 createVibe 创建实例

```typescript
import { createVibe } from 'vibe';

const v = createVibe();

// 任意函数调用
const result = await v.add(5, 3); // LLM 会生成 add 函数的实现
console.log(result); // 8

const reversed = await v.reverseString('hello');
console.log(reversed); // 'olleh'

// 中文函数名
const sum = await v.加法(10, 20);
console.log(sum); // 30
```

### 2. 带类型验证（使用 Zod）

```typescript
import { createVibe } from 'vibe';
import { z } from 'zod';

const v = createVibe();

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// 使用链式调用进行类型验证
const person = await v.createPerson('Alice', 25)(personSchema);
console.log(person); // { name: 'Alice', age: 25, email: '...' }

// 或者使用 withSchema 方法
const person2 = await v.createPerson('Bob', 30).withSchema(personSchema);
```

### 3. 使用装饰器

```typescript
import { VibeClass, vibeFn } from 'vibe';

@VibeClass()
class Calculator {
  @vibeFn
  multiply(a: number, b: number): any {
    // 这个方法会被 LLM 生成的代码替换
    return;
  }

  @vibeFn
  factorial(n: number): any {
    return;
  }
}

const calc = new Calculator();
const result = await calc.multiply(6, 7); // 42
const fact = await calc.factorial(5); // 120
```

### 4. 实用方法

```typescript
import { createVibe, vibeUtils } from 'vibe';

const v = createVibe();

// 清除缓存
await vibeUtils.clearCache();

// 读取日志
const logs = await vibeUtils.readLogs();

// 读取特定日期的日志
const logsToday = await vibeUtils.readLogs('2026-01-12');

// 清空日志
await vibeUtils.clearLogs();
```

### 5. 使用自定义配置

```typescript
import { createVibe } from 'vibe';

const v = createVibe({
  apiKey: 'custom-api-key',
  model: 'gpt-3.5-turbo',
  baseUrl: 'https://api.openai.com/v1',
  cacheDir: '.my-cache',
  strict: true,
});
```

## 运行示例

```bash
bun run example
```

## 运行测试

```bash
bun run test
```

## 构建

```bash
bun run build
```

## 工作原理

1. **调用拦截**: 使用 Proxy 拦截所有函数调用
2. **缓存检查**: 首先检查缓存中是否已有生成的代码
3. **代码生成**: 如果缓存未命中，调用 LLM 生成 **JavaScript** 函数实现
4. **代码执行**: 使用 `new Function()` 直接执行生成的 JavaScript 代码
5. **类型验证**: 如果提供了 Zod schema，验证输出类型
6. **结果缓存**: 将生成的代码保存到缓存中

**注意**: LLM 生成的是 JavaScript 代码（可直接执行），类型安全由 Zod schema 提供。

## 注意事项

- ⚠️ 这是娱乐项目，不保证代码安全性
- ⚠️ 每次函数调用都可能需要时间（除非命中缓存）
- ⚠️ LLM 生成的代码可能包含错误
- ⚠️ 建议仅在开发和测试环境中使用

## 缓存和日志

### 缓存

缓存默认保存在 `.vibe/cache` 目录中，缓存键基于：
- 函数名
- 参数类型
- 输出类型（如果有）

可以手动清除缓存：

```typescript
await vibeUtils.clearCache();
```

### 日志记录

每次函数调用都会被记录到 `.vibe/logs` 目录中，日志文件按日期命名（例如：`vibe-2026-01-12.jsonl`）。

日志记录包含：
- 时间戳
- 函数名
- 输入参数
- 输出 schema（如果有）
- 是否使用缓存
- 生成的代码
- 执行结果
- 是否成功
- 错误信息（如果有）
- 执行耗时（毫秒）
- **LLM 请求**（仅新调用，非缓存）
  - 系统提示词
  - 用户提示词
  - 模型名称
  - 温度参数
  - 最大 tokens
- **LLM 响应**（仅新调用，非缓存）
  - 原始响应内容
  - 结束原因
  - Token 使用情况

**阅读日志**:

```typescript
// 读取今天的日志
const logs = await v.readLogs();

// 读取特定日期的日志 (YYYY-MM-DD)
const logs = await v.readLogs('2026-01-12');

// 清空所有日志
await v.clearLogs();
```

运行日志示例：

```bash
bun run log-example
```

## License

MIT
