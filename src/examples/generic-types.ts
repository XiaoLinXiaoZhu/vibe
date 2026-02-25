import { createVibe } from "../vibe";
import { z } from "zod";

const v = createVibe();

// 示例 1: 使用泛型指定返回类型
async function example1() {
  console.log("=== 示例 1: 使用泛型指定返回类型 ===");
  
  // 使用 <number> 指定返回类型
  const result = await v.add<number>(5, 3);
  console.log("类型:", typeof result, "值:", result);
  
  // TypeScript 会推断 result 的类型为 number
  const doubled: number = result * 2;
  console.log("Double:", doubled);
}

// 示例 2: 结合 zod schema
async function example2() {
  console.log("\n=== 示例 2: 结合 zod schema ===");
  
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  
  // 使用 z.infer 推断类型
  type Person = z.infer<typeof schema>;
  
  const person = await v.createPerson<Person>("Alice", 30)(schema);
  console.log("Person:", person);
  
  // TypeScript 知道 person 是 Person 类型
  console.log("Name:", person.name);
  console.log("Age:", person.age);
}

// 示例 3: 使用 withSchema 方法
async function example3() {
  console.log("\n=== 示例 3: 使用 withSchema ===");
  
  const schema = z.array(z.number());
  
  const numbers = await v.generateNumbers<number[]>(1, 10).withSchema(schema);
  console.log("Numbers:", numbers);
  
  // TypeScript 知道 numbers 是 number[]
  const sum: number = numbers.reduce((a, b) => a + b, 0);
  console.log("Sum:", sum);
}

// 示例 4: 直接传入 schema
async function example4() {
  console.log("\n=== 示例 4: 直接传入 schema ===");
  
  const schema = z.string();
  type Result = z.infer<typeof schema>;
  
  const greeting = await v.greet<Result>("World")(schema);
  console.log("Greeting:", greeting);
  
  // TypeScript 知道 greeting 是 string
  console.log("Length:", greeting.length);
}

// 示例 5: 复杂对象类型
async function example5() {
  console.log("\n=== 示例 5: 复杂对象类型 ===");
  
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
  console.log("User:", JSON.stringify(user, null, 2));
  
  // TypeScript 完全了解 user 的结构
  console.log("Username:", user.username);
  console.log("Email:", user.email);
  console.log("Roles:", user.roles.join(", "));
  console.log("Created:", user.metadata.createdAt);
}

// 运行所有示例
async function main() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
