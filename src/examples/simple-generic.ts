import { createVibe } from "../index";
import { z } from "zod";

const v = createVibe();

// 示例 1：基本使用（验证类型推断）
async function example1() {
  // 使用泛型指定返回类型
  const result = await v.add<number>(5, 3);
  
  console.log("Result:", result);
  console.log("Type:", typeof result);
  
  // TypeScript 知道 result 是 number，可以安全地使用
  const doubled = result * 2;
  console.log("Doubled:", doubled);
}

// 示例 2：使用 z.infer（最佳实践）
async function example2() {
  const personSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });
  
  type Person = z.infer<typeof personSchema>;
  
  // 使用泛型和 schema
  const person = await v.generatePerson<Person>("developer")(personSchema);
  
  console.log("\nPerson:", person);
  
  // TypeScript 完全理解类型结构，提供智能提示
  console.log("Name:", person.name);
  console.log("Age:", person.age);
  console.log("Email:", person.email);
}

// 示例 3：数组类型
async function example3() {
  const schema = z.array(z.number());
  
  const numbers = await v.fibonacci<number[]>(10).withSchema(schema);
  
  console.log("\nFibonacci:", numbers);
  
  // TypeScript 知道这是 number[]
  const sum = numbers.reduce((a, b) => a + b, 0);
  console.log("Sum:", sum);
}

// 运行所有示例
async function main() {
  try {
    await example1();
    await example2();
    await example3();
    
    console.log("\n✅ 所有示例运行成功！泛型类型支持正常工作。");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
