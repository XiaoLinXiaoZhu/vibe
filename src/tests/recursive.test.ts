import { createVibe } from '../index.js';
import { z } from 'zod';

/**
 * 测试递归调用和函数组合
 * 验证 AI 生成的代码可以调用其他 AI 函数
 */

const v = createVibe();

console.log('=== 测试 AI 函数递归调用 ===\n');

// 测试 1: 简单的函数组合
console.log('测试 1: 调用其他 AI 函数完成任务');
console.log('调用: v.calculateCircleArea(5)');
console.log('期望: AI 可能会调用 v.square() 或 v.multiply() 等辅助函数\n');

try {
  const area = await v.calculateCircleArea(5);
  console.log('✅ 结果:', area);
  console.log('类型:', typeof area);
} catch (error) {
  console.log('❌ 错误:', error);
}

// 测试 2: 带 schema 的函数组合
console.log('\n测试 2: 带类型验证的函数组合');
console.log('调用: v.generateUserProfile("Alice", 25)(schema)');

try {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
    bio: z.string()
  });
  
  const profile = await v.generateUserProfile('Alice', 25)(userSchema);
  console.log('✅ 结果:', profile);
} catch (error) {
  console.log('❌ 错误:', error);
}

// 测试 3: 复杂任务 - emoji 转字符画（需要调用其他函数）
console.log('\n测试 3: 复杂任务 - emoji 转字符画');
console.log('调用: v.将emoji转化为字符画("👀", 10, 10)');
console.log('期望: AI 可能会分解任务，调用多个辅助函数\n');

try {
  const art = await v.将emoji转化为字符画('👀', 10, 10);
  console.log('✅ 结果:');
  console.log(art);
} catch (error) {
  console.log('❌ 错误:', error);
}

// 测试 4: 数据处理流程
console.log('\n测试 4: 数据处理流程');
console.log('调用: v.processUserData([1,2,3,4,5])');
console.log('期望: AI 可能会调用 v.sum(), v.average() 等函数\n');

try {
  const arraySchema = z.object({
    sum: z.number(),
    average: z.number(),
    max: z.number(),
    min: z.number()
  });
  
  const stats = await v.processUserData([1, 2, 3, 4, 5])(arraySchema);
  console.log('✅ 结果:', stats);
} catch (error) {
  console.log('❌ 错误:', error);
}

// 测试 5: 测试 z (zod) 在生成代码中的使用
console.log('\n测试 5: AI 代码中使用 zod 验证');
console.log('调用: v.createValidatedObject({name: "test", age: 25})');
console.log('期望: AI 生成的代码内部使用 z 进行验证\n');

try {
  const result = await v.createValidatedObject({ name: 'test', age: 25 });
  console.log('✅ 结果:', result);
} catch (error) {
  console.log('❌ 错误:', error);
}

console.log('\n=== 递归调用测试完成 ===');
