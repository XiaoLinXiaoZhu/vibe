import { vibeUtils } from '../index.js';

export async function testUtils() {
  console.log('=== 实用方法测试 ===\n');

  // 测试 1: 读取日志
  console.log('测试 1: 读取日志');
  const logs = await vibeUtils.readLogs();
  console.log(`  找到 ${logs.length} 条日志 ✓\n`);

  // 测试 2: 清除缓存
  console.log('测试 2: 清除缓存');
  await vibeUtils.clearCache();
  console.log(`  缓存已清除 ✓\n`);

  // 测试 3: 清空日志
  console.log('测试 3: 清空日志');
  await vibeUtils.clearLogs();
  console.log(`  日志已清空 ✓\n`);

  console.log('=== 实用方法测试完成 ===\n');
}
