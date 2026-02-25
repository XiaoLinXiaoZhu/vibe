import { createVibe } from '../index.js';

export async function testCache() {
  console.log('=== 缓存功能测试 ===\n');

  const v = createVibe();

  // 测试 1: 首次调用（LLM）
  console.log('测试 1: 首次调用（调用 LLM）');
  const start1 = Date.now();
  const result1 = await v.add(100, 200);
  const time1 = Date.now() - start1;
  console.log(`  v.add(100, 200) = ${result1}`);
  console.log(`  耗时: ${time1}ms ✓\n`);

  // 测试 2: 第二次调用（缓存）
  console.log('测试 2: 第二次调用（使用缓存）');
  const start2 = Date.now();
  const result2 = await v.add(100, 200);
  const time2 = Date.now() - start2;
  console.log(`  v.add(100, 200) = ${result2}`);
  console.log(`  耗时: ${time2}ms (应该更快) ✓\n`);

  // 验证结果一致
  if (result1 === result2 && time2 < time1) {
    console.log('  缓存验证: 通过 ✓\n');
  } else {
    console.error('  缓存验证: 失败 ✗\n');
  }

  console.log('=== 缓存功能测试完成 ===\n');
}
