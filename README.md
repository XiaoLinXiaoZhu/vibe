# Vibe

[![NPM Version](https://img.shields.io/npm/v/vibe.svg)](https://www.npmjs.com/package/vibe)
[![License](https://img.shields.io/npm/l/vibe.svg)](LICENSE)

一个有趣的 TypeScript 库，使用 LLM 动态生成函数实现。

> ⚠️ **注意**：该库为娱乐项目，不保证其安全性，请勿用于生产环境。

## 特性

- 🤖 **AI 生成函数**：任何函数都可以通过 LLM 自动生成实现
- 🚀 **智能缓存**：缓存生成的函数实现，避免重复调用 LLM
- 🎯 **类型安全**：使用 Zod schema 控制输出类型
- 🔗 **函数组合**：AI 生成的代码可以调用其他 AI 函数
- 🌐 **多语言支持**：支持中文函数名和特殊字符
- ⚡ **灵活调用**：支持点号、方括号等多种调用方式
- 📊 **日志记录**：完整的调用日志记录，方便调试和追踪

## 安装

```bash
npm install vibe
```

或使用其他包管理器：

```bash
yarn add vibe
pnpm add vibe
bun add vibe
```

## 快速开始

### 前置要求

使用vibe之前，需要设置环境变量：

```bash
# Linux/Mac
export LLM_API_KEY=your_api_key_here
export LLM_MODEL=gpt-4  # 可选
export LLM_BASE_URL=https://api.openai.com/v1  # 可选

# Windows (PowerShell)
$env:LLM_API_KEY="your_api_key_here"
$env:LLM_MODEL="gpt-4"  # 可选
$env:LLM_BASE_URL="https://api.openai.com/v1"  # 可选

# Windows (CMD)
set LLM_API_KEY=your_api_key_here
set LLM_MODEL=gpt-4  # 可选
set LLM_BASE_URL=https://api.openai.com/v1  # 可选
```

### 基础使用

```typescript
import { createVibe } from 'vibe';

const v = createVibe({
  apiKey: 'your-api-key', // 从环境变量 LLM_API_KEY 读取
  model: 'gpt-4',          // 从环境变量 LLM_MODEL 读取
  baseUrl: 'https://api.openai.com/v1' // 从环境变量 LLM_BASE_URL 读取
});

// 直接调用任意函数
const result = await v.add(5, 3);
console.log(result); // 8

// 支持中文函数名
const sum = await v.加法(10, 20);
console.log(sum); // 30
```

### 带类型验证

```typescript
import { z } from 'zod';

// 使用 Zod schema 验证输出
const price = await v.calculateTotalPrice(100, 0.2)(z.number());
console.log(price); // 120.0

// 使用 withSchema 方法
const result = await v.processData('input').withSchema(z.object({
  id: z.number(),
  name: z.string()
}));
```

## 使用方法

### 1. 基础函数调用

支持多种调用方式：

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
```

### 2. 带类型参数的调用

```typescript
// 点号调用 + 链式调用
v.add(5, 3)(z.number());

// 方括号调用 + 链式调用
v["add"](5, 3)(z.number());

// 使用 .withSchema 方法（点号）
v.add(5, 3).withSchema(z.number());

// 使用 .withSchema 方法（方括号）
v["add"](5, 3).withSchema(z.number());
```

### 3. 泛型类型支持（TypeScript）

使用泛型 `<T>` 获得更严格的类型检查：

```typescript
// 基本泛型
const result = await v.add<number>(5, 3);
// TypeScript 知道 result 是 number 类型

// 结合 zod schema（推荐）
const schema = z.object({
  name: z.string(),
  age: z.number(),
});
type Person = z.infer<typeof schema>;

const person = await v.createPerson<Person>("Alice", 30)(schema);
// TypeScript 完全理解 person 的类型结构
console.log(person.name); // ✅ 类型安全
console.log(person.age);  // ✅ 类型安全
```

更多详情请参考 [泛型类型文档](docs/generic-types.md)。

### 4. 函数组合

AI 生成的代码可以调用其他 AI 函数，实现复杂功能的分解和组合：

```typescript
// 例如：v.将emoji转化为字符画() 的实现可能会调用其他辅助函数
// AI 可能生成如下代码：
// await v.getEmojiUnicode(args[0])
// await v.generateASCIIArt(unicode, args[1], args[2])
```

## 全局对象

AI 生成的代码在执行时可以访问以下全局对象：

### 1. `v` - Vibe 实例

可以调用其他 AI 函数：

```javascript
// 调用其他 AI 函数
const result1 = await v.helperFunction(args[0]);
const result2 = await v.anotherFunction(result1, args[1]);
return result2;
```

### 2. `z` - Zod 库

用于类型验证和 schema 定义：

```javascript
// 使用 zod 进行验证
const validated = z.number().parse(args[0]);
return validated * 2;
```

### 3. `args` - 参数数组

通过 `args[0]`, `args[1]` 等访问调用参数：

```javascript
// 访问参数
const firstArg = args[0];
const secondArg = args[1];
```

### 高级示例

```javascript
// 示例 1: 函数组合 + 类型验证
const data = await v.fetchData(args[0])(z.object({ 
  name: z.string() 
}));
return await v.processData(data)(z.string());

// 示例 2: 动态函数调用
const funcName = `process${args[0]}`;
return await v[funcName](args[1], args[2]);

// 示例 3: 使用 .then() 处理 Promise
return await v.getData(args[0]).then(data => {
  return v.processData(data, args[1]);
});
```

## 实用方法

通过 `vibeUtils` 对象提供实用工具方法：

```typescript
import { vibeUtils } from 'vibe';

// 清除所有缓存
await vibeUtils.clearCache();

// 读取日志
const logs = await vibeUtils.readLogs();
console.log(logs);

// 读取特定日期的日志
const todayLogs = await vibeUtils.readLogs('2026-01-13');

// 清空所有日志
await vibeUtils.clearLogs();
```

## 配置选项

创建 Vibe 实例时可以传入配置对象：

```typescript
interface VibeConfig {
  /** LLM API 密钥（默认从环境变量 OPENAI_API_KEY 读取） */
  apiKey?: string;
  
  /** LLM 模型名称（默认: gpt-4） */
  model?: string;
  
  /** LLM API 基础 URL（默认: https://api.openai.com/v1） */
  baseUrl?: string;
  
  /** 缓存目录路径（默认: .vibe/cache） */
  cacheDir?: string;
  
  /** 是否启用严格模式，严格验证输出类型（默认: false） */
  strict?: boolean;
}
```

### 配置示例

```typescript
const v = createVibe({
  apiKey: 'your-api-key',      // 也可从环境变量 LLM_API_KEY 读取
  model: 'gpt-4-turbo',       // 也可从环境变量 LLM_MODEL 读取
  baseUrl: 'https://api.openai.com/v1', // 也可从环境变量 LLM_BASE_URL 读取
  cacheDir: '.vibe/cache',
  strict: true
});
```

**提示**：如果不提供配置，vibe 会自动从以下环境变量读取：
- `LLM_API_KEY` - API密钥
- `LLM_MODEL` - 模型名称（默认: gpt-4）
- `LLM_BASE_URL` - API基础URL（默认: https://api.openai.com/v1）

## 实现细节

1. **代码生成**：LLM 生成的是 JavaScript 代码（可直接执行），类型安全由 Zod schema 提供，不依赖 TypeScript 编译。

2. **Proxy 机制**：`createVibe()` 返回一个纯 Proxy，所有属性访问都被当作 AI 函数调用。

3. **调用方式支持**：
   - `v.函数名(参数)` / `v["函数名"](参数)`
   - `v.函数名(参数)(schema)` / `v["函数名"](参数)(schema)`
   - `v.函数名(参数).withSchema(schema)` / `v["函数名"](参数).withSchema(schema)`

4. **方括号调用**：支持动态函数名和特殊字符。

5. **全局对象支持**：AI 生成的代码可以访问 `v`、`z`、`args` 三个全局对象。

6. **函数组合**：AI 可以生成调用其他 AI 函数的代码，实现复杂功能的分解和组合。

7. **智能缓存**：缓存时同时检查函数名、参数类型、输出类型（若有）是否相同，若相同则使用缓存。

8. **类型验证**：使用 zod 支持控制输出类型，该部分会传递给 LLM，从而控制输出类型。

9. **严格模式**：可选 strict 模型，该模式下，vibe 会严格检查输出类型，若不匹配，则抛出错误。

10. **OpenAI API**：使用 OpenAI 提供的 API，保证兼容性。

11. **日志记录**：每次函数调用都会记录到 `.vibe/logs` 目录，包含完整的 LLM 请求、响应、生成的代码、执行时间等信息。

## 示例项目

### 将领战棋游戏 🎮

一个完全由LLM动态生成内容的策略战棋游戏，展示了vibe库的强大能力：

- 🤖 **AI生成将领**：每个将领的名字、描述、属性和技能都由LLM动态生成
- 👹 **AI生成敌人**：普通敌人和Boss都由LLM创建，拥有独特的能力
- 🧠 **AI战斗系统**：伤害计算、技能效果、敌人AI决策都由LLM实时计算
- 🎯 **战棋玩法**：3层12关卡的回合制策略游戏

#### 快速体验

```bash
# 1. 设置API密钥
export OPENAI_API_KEY=your_api_key

# 2. 启动游戏服务器
bun run game-server

# 3. 在浏览器打开
# 访问 http://localhost:3000/index.html
```

#### 查看API示例

```bash
# 查看vibe API调用示例（不启动服务器）
bun run game-demo
```

详细说明请查看 [游戏示例文档](src/examples/game/README.md)。

## 开发

```bash
# 运行测试
bun run test

# 运行示例
bun run playground

# 构建
bun run build
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 警告

- 该项目为娱乐和学习目的创建，不保证代码安全性和稳定性
- 请勿在生产环境中使用
- AI 生成的代码可能包含安全漏洞，请谨慎使用
- 每次函数调用都会消耗 API 额度，请注意成本
