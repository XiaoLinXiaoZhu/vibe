import { createVibe } from "../index";
import { z } from "zod";

// 这个文件用于测试 TypeScript 的类型推断
// 不需要运行，只需要通过类型检查即可

const v = createVibe();

// 测试 1: 基本泛型
async function test1() {
  const result = await v.add<number>(5, 3);
  
  // 类型检查：result 应该是 number
  const doubled: number = result * 2;
  
  // @ts-expect-error - 应该报错，因为 result 不是 string
  const wrongType: string = result;
}

// 测试 2: 结合 zod
async function test2() {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  
  type Person = z.infer<typeof schema>;
  
  const person = await v.createPerson<Person>("Alice", 30)(schema);
  
  // 类型检查：person 应该有 name 和 age 属性
  const name: string = person.name;
  const age: number = person.age;
  
  // @ts-expect-error - 应该报错，person 没有 email 属性
  const email = person.email;
}

// 测试 3: withSchema 方法
async function test3() {
  const schema = z.array(z.number());
  
  const numbers = await v.generateNumbers<number[]>(1, 10).withSchema(schema);
  
  // 类型检查：numbers 应该是 number[]
  const sum: number = numbers.reduce((a, b) => a + b, 0);
  
  // @ts-expect-error - 应该报错，因为 numbers 不是 string[]
  const strings: string[] = numbers;
}

// 测试 4: 复杂嵌套类型
async function test4() {
  const schema = z.object({
    id: z.number(),
    data: z.object({
      items: z.array(z.string()),
      count: z.number(),
    }),
  });
  
  type Result = z.infer<typeof schema>;
  
  const result = await v.process<Result>().withSchema(schema);
  
  // 类型检查：应该能访问嵌套属性
  const id: number = result.id;
  const items: string[] = result.data.items;
  const count: number = result.data.count;
  
  // @ts-expect-error - 应该报错
  const wrongProp = result.data.nonExistent;
}

// 测试 5: 不使用泛型
async function test5() {
  const result = await v.someFunction(1, 2, 3);
  
  // 类型检查：result 应该是 unknown（因为没有指定类型）
  const value: unknown = result;
  
  // 可以赋值给 any
  const anyValue: any = result;
}

console.log("Type tests passed! (this file only needs to type-check, not run)");
