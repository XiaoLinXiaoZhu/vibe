# 泛型类型快速参考

## 基本语法

```typescript
v.functionName<T>(args)              // 指定返回类型
v.functionName<T>(args)(schema)       // 泛型 + schema
v.functionName<T>(args).withSchema(schema)  // 泛型 + withSchema
```

## 常见模式

### 1. 简单类型
```typescript
const num = await v.add<number>(5, 3);
const str = await v.greet<string>("World");
const bool = await v.isEven<boolean>(42);
```

### 2. 对象类型（使用 z.infer）
```typescript
const schema = z.object({
  name: z.string(),
  age: z.number(),
});
type Person = z.infer<typeof schema>;

const person = await v.createPerson<Person>("Alice", 30)(schema);
```

### 3. 数组类型
```typescript
const numbers = await v.range<number[]>(1, 10).withSchema(z.array(z.number()));
```

### 4. 嵌套类型
```typescript
const schema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
  }),
  posts: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
});
type Data = z.infer<typeof schema>;

const data = await v.fetchUserData<Data>(userId)(schema);
```

## 提示

- 💡 始终使用 `z.infer<typeof schema>` 保持类型和 schema 同步
- 💡 泛型仅用于 TypeScript 类型检查，运行时验证靠 schema
- 💡 如果不确定类型，可以省略泛型，使用 `unknown`
- 💡 IDE 会根据泛型提供智能提示
