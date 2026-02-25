import { createVibe } from '../index.js';
import { z } from 'zod';

export async function testChinese() {
  console.log('=== 中文函数名测试 ===\n');

  const v = createVibe();

  // 测试 1: 中文加法
  console.log('测试 1: 中文加法');
  const result1 = await v.加法(10, 20);
  console.log(`  v.加法(10, 20) = ${result1} ✓\n`);

  // 测试 2: 中文减法
  console.log('测试 2: 中文减法');
  const result2 = await v.减法(100, 30);
  console.log(`  v.减法(100, 30) = ${result2} ✓\n`);

  // 测试 3: 带类型验证的中文函数
  console.log('测试 3: 带类型验证');
  const result3 = await v.加法(5, 7)(z.number());
  console.log(`  v.加法(5, 7)(z.number()) = ${result3} ✓\n`);

  // 测试 4: 中文字符串处理
  console.log('测试 4: 字符串处理');
  const result4 = await v.将字符串转大写('hello world')(z.string());
  console.log(`  v.将字符串转大写('hello world') = ${result4} ✓\n`);

  // 测试 5: 复杂中文函数名
  console.log('测试 5: 复杂中文函数 - 数组操作');
  const result5 = await v.计算数组的和([1, 2, 3, 4, 5])(z.number());
  console.log(`  v.计算数组的和([1, 2, 3, 4, 5]) = ${result5} ✓\n`);

  console.log('=== 中文函数名测试完成 ===\n');
}
