# 泛型类型支持

vibe 现在支持使用泛型 `<T>` 来指定更严格的类型。

## 基本用法

### 1. 直接指定返回类型

```typescript
import { createVibe } from "vibe";
import { z } from "zod";

const v = createVibe();

// 使用泛型指定返回类型为 number
const result = await v.add<number>(5, 3);
// TypeScript 知道 result 是 number 类型
const doubled: number = result * 2;
```

### 2. 结合 zod schema

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

// 使用 z.infer 推断类型
type Person = z.infer<typeof schema>;

// 方式 1: 使用泛型 + schema
const person = await v.createPerson<Person>("Alice", 30)(schema);

// 方式 2: 使用 withSchema
const person2 = await v.createPerson<Person>("Bob", 25).withSchema(schema);

// TypeScript 完全了解 person 的类型
console.log(person.name); // ✅ 类型安全
console.log(person.age);  // ✅ 类型安全
```

### 3. 数组和复杂类型

```typescript
const arraySchema = z.array(z.number());

// 指定返回类型为 number[]
const numbers = await v.generateNumbers<number[]>(1, 10).withSchema(arraySchema);

// TypeScript 知道 numbers 是 number[]
const sum = numbers.reduce((a, b) => a + b, 0);
```

### 4. 复杂对象类型

```typescript
const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
  metadata: z.object({
    createdAt: z.string(),
    lastLogin: z.string().optional(),
  }),
});

type User = z.infer<typeof userSchema>;

const user = await v.generateUser<User>("admin")(userSchema);

// TypeScript 完全理解嵌套结构
console.log(user.username);              // ✅ string
console.log(user.roles.join(", "));      // ✅ string[]
console.log(user.metadata.createdAt);    // ✅ string
console.log(user.metadata.lastLogin);    // ✅ string | undefined
```

## 所有支持的调用方式

```typescript
// 1. 基本调用（无类型）
await v.functionName(args);

// 2. 带泛型
await v.functionName<T>(args);

// 3. 带 schema
await v.functionName(args)(schema);

// 4. 带泛型 + schema
await v.functionName<T>(args)(schema);

// 5. 使用 withSchema（无泛型）
await v.functionName(args).withSchema(schema);

// 6. 使用 withSchema（带泛型）
await v.functionName<T>(args).withSchema(schema);

// 7. 结合 z.infer（推荐）
const schema = z.object({ /* ... */ });
type T = z.infer<typeof schema>;
await v.functionName<T>(args)(schema);
```

## 类型安全的优势

使用泛型后，TypeScript 可以：

1. ✅ **类型推断**：自动推断变量类型
2. ✅ **类型检查**：编译时发现类型错误
3. ✅ **智能提示**：IDE 提供准确的代码补全
4. ✅ **重构安全**：修改类型时自动检查所有使用处

## 示例：完整的类型安全工作流

```typescript
// 定义 schema
const todoSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  tags: z.array(z.string()),
});

// 推断类型
type Todo = z.infer<typeof todoSchema>;

// 使用泛型调用
const todo = await v.createTodo<Todo>("Learn TypeScript", ["typescript", "learning"])(todoSchema);

// TypeScript 完全理解 todo 的结构
if (!todo.completed) {
  console.log(`待办事项: ${todo.title}`);
  console.log(`标签: ${todo.tags.join(", ")}`);
}

// 类型安全的数组操作
const allTodos = await v.getAllTodos<Todo[]>().withSchema(z.array(todoSchema));
const incompleteTodos = allTodos.filter(t => !t.completed);
```

## 注意事项

1. 泛型类型仅用于 TypeScript 的类型检查，运行时验证仍依赖 zod schema
2. 建议始终使用 `z.infer<typeof schema>` 来保持类型和 schema 同步
3. 如果不提供 schema，则无法在运行时验证类型
