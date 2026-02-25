# 全局对象支持 (Global Objects)

## 概述

从这个版本开始，AI 生成的代码可以访问全局对象 `v` (vibe) 和 `z` (zod)，这使得 AI 可以实现函数组合和复杂功能的分解。

## 可用的全局对象

### 1. `v` - Vibe 实例

AI 生成的代码可以调用其他 AI 函数，实现功能的组合和分解。

```javascript
// AI 生成的代码示例
const helper = await v.helperFunction(args[0]);
return await v.processResult(helper);
```

### 2. `z` - Zod 库

AI 可以使用 zod 进行类型验证和 schema 定义。

```javascript
// AI 生成的代码示例
const validated = z.number().parse(args[0]);
return validated * 2;
```

### 3. `args` - 参数数组

所有传入的参数都在 `args` 数组中。

```javascript
// AI 生成的代码示例
const first = args[0];
const second = args[1];
return first + second;
```

## 使用场景

### 场景 1: 复杂功能分解

当用户请求一个复杂功能时，AI 可以将其分解为多个简单的子任务：

```typescript
// 用户调用
const art = await v.将emoji转化为字符画("❤️", 10, 10);

// AI 可能生成的代码：
const unicode = await v.getEmojiUnicode(args[0]);
const matrix = await v.unicodeToMatrix(unicode, args[1], args[2]);
const ascii = await v.matrixToASCII(matrix);
return ascii;
```

### 场景 2: 数据处理管道

AI 可以创建数据处理流程：

```typescript
// 用户调用
const result = await v.processUserData([1, 2, 3, 4, 5])(schema);

// AI 可能生成的代码：
const doubled = await v.doubleArray(args[0]);
const sum = await v.sum(doubled);
const avg = await v.average(doubled);
return z.object({
  doubled: z.array(z.number()),
  sum: z.number(),
  average: z.number()
}).parse({ doubled, sum, average: avg });
```

### 场景 3: 类型安全的中间结果

AI 可以在处理过程中使用 zod 验证中间结果：

```typescript
// AI 生成的代码：
const rawData = await v.fetchData(args[0]);
const validated = z.object({
  id: z.number(),
  name: z.string()
}).parse(rawData);
return await v.formatData(validated);
```

### 场景 4: 动态函数调用

AI 可以根据参数动态选择调用哪个函数：

```typescript
// AI 生成的代码：
const type = args[0];
const data = args[1];

if (type === 'number') {
  return await v.processNumber(data);
} else if (type === 'string') {
  return await v.processString(data);
} else {
  return await v.processGeneric(data);
}
```

## 技术实现

### AsyncFunction 支持

生成的代码使用 `AsyncFunction` 执行，支持 `await` 关键字：

```javascript
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const fn = new AsyncFunction('args', 'v', 'z', code);
return await fn(args, vibeProxy, zodNamespace);
```

### Proxy 传递

`v` 对象是 vibe 实例的 Proxy，确保所有的函数调用都经过正确的处理：

```typescript
const vibeProxy = new Proxy(instance, {
  get(_target, prop: string | symbol) {
    // ... 返回函数调用构建器
  }
});
```

### 缓存机制

递归调用也会被缓存，避免重复的 LLM 调用：

- 每个函数调用都有独立的缓存键
- 包括函数名、参数类型、输出 schema
- 递归调用会从缓存中获取已生成的代码

## LLM Prompt 更新

系统 prompt 已更新，告知 AI 可以使用这些全局对象：

```
Available global objects:
- v: vibe instance for calling other AI functions
- z: zod library for schema validation

For complex tasks, you can compose functions by calling v recursively.
Example: await v["helper function"](data)(z.string())
```

## 注意事项

1. **异步调用**: 调用 `v` 的函数都是异步的，需要使用 `await`
2. **缓存**: 递归调用会被缓存，相同的调用不会重复请求 LLM
3. **无限递归**: 理论上可能出现，但缓存机制会限制实际的 LLM 调用次数
4. **性能**: 首次调用可能需要多次 LLM 请求，但后续调用会从缓存读取

## 测试

运行测试查看实际效果：

```bash
# 递归调用测试
tsx src/tests/recursive.test.ts

# 全局对象示例
tsx src/examples/global-objects.ts
```

## 示例代码

查看以下文件了解更多示例：

- `src/tests/recursive.test.ts` - 递归调用测试
- `src/examples/global-objects.ts` - 全局对象使用示例
- `src/usage.ts` - 基础使用示例
