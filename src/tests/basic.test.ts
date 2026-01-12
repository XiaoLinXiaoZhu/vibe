import { createVibe } from '../index.js';

export async function testBasic() {
  console.log('=== 基础功能测试 ===\n');

  const v = createVibe();

  // 测试 1: 加法
  console.log('测试 1: 加法');
  const result1 = await v.add(5, 3);
  console.log(`  v.add(5, 3) = ${result1} ✓\n`);

  // 测试 2: 减法
  console.log('测试 2: 减法');
  const result2 = await v.subtract(20, 8);
  console.log(`  v.subtract(20, 8) = ${result2} ✓\n`);

  // 测试 3: 乘法
  console.log('测试 3: 乘法');
  const result3 = await v.multiply(6, 7);
  console.log(`  v.multiply(6, 7) = ${result3} ✓\n`);

  // 测试 4: 字符串反转
  console.log('测试 4: 字符串反转');
  const result4 = await v.reverseString('hello');
  console.log(`  v.reverseString('hello') = ${result4} ✓\n`);

  console.log('=== 基础功能测试完成 ===\n');
}
