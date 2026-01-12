import { createVibe } from '../index.js';
import { z } from 'zod';

export async function testChained() {
  console.log('=== 链式调用测试 ===\n');

  const v = createVibe();

  // 测试 1: 无 schema 调用
  console.log('测试 1: 无 schema');
  const result1 = await v.add(3, 4);
  console.log(`  v.add(3, 4) = ${result1} ✓\n`);

  // 测试 2: 带 schema 调用
  console.log('测试 2: 带 schema');
  const result2 = await v.add(3, 4)(z.number());
  console.log(`  v.add(3, 4)(z.number()) = ${result2} ✓\n`);

  // 测试 3: 对象 schema
  console.log('测试 3: 对象 schema');
  const personSchema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const result3 = await v.createPerson('Alice', 25)(personSchema);
  console.log(`  v.createPerson('Alice', 25)(schema) = ${JSON.stringify(result3)} ✓\n`);

  // 测试 4: withSchema 方法
  console.log('测试 4: withSchema 方法');
  const result4 = await v.createPerson('Bob', 30).withSchema(personSchema);
  console.log(`  v.createPerson('Bob', 30).withSchema(schema) = ${JSON.stringify(result4)} ✓\n`);

  console.log('=== 链式调用测试完成 ===\n');
}
