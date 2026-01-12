import { createVibe, vibeUtils, VibeClass, vibeFn } from './index.js';
import { z } from 'zod';

console.log('=== Vibe 测试 ===\n');

// 测试 1: 基础函数调用
console.log('测试 1: 基础函数调用');
async function testBasicFunctionCall() {
  try {
    const v = createVibe();
    const result = await v.add(10, 20);
    console.log('✓ 基础函数调用通过');
    console.log(`  结果: ${result}`);
  } catch (error) {
    console.error('✗ 基础函数调用失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 2: 带类型验证的函数调用
console.log('\n测试 2: 带类型验证的函数调用');
async function testWithSchema() {
  try {
    const v = createVibe();
    const schema = z.object({
      sum: z.number(),
      product: z.number(),
    });
    const result = await v.calculate(5, 10)(schema);
    console.log('✓ 带类型验证的函数调用通过');
    console.log(`  结果:`, result);
  } catch (error) {
    console.error('✗ 带类型验证的函数调用失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 3: 缓存功能
console.log('\n测试 3: 缓存功能');
async function testCache() {
  try {
    const v = createVibe();
    
    console.log('  第一次调用 (会调用 LLM)...');
    const start1 = Date.now();
    const result1 = await v.add(100, 200);
    const time1 = Date.now() - start1;
    
    console.log('  第二次调用 (使用缓存)...');
    const start2 = Date.now();
    const result2 = await v.add(100, 200);
    const time2 = Date.now() - start2;
    
    if (result1 === result2) {
      console.log('✓ 缓存功能通过');
      console.log(`  第一次耗时: ${time1}ms`);
      console.log(`  第二次耗时: ${time2}ms (应该更快)`);
    } else {
      console.error('✗ 缓存结果不一致');
    }
  } catch (error) {
    console.error('✗ 缓存功能测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 4: 装饰器
console.log('\n测试 4: 装饰器');
async function testDecorator() {
  try {
    @VibeClass()
    class TestClass {
      @vibeFn
      square(n: number): any {
        return;
      }
    }

    const test = new TestClass();
    const result = await test.square(8);
    console.log('✓ 装饰器测试通过');
    console.log(`  结果: ${result}`);
  } catch (error) {
    console.error('✗ 装饰器测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 5: 字符串处理
console.log('\n测试 5: 字符串处理');
async function testStringProcessing() {
  try {
    const v = createVibe();
    const result = await v.capitalize('hello world');
    console.log('✓ 字符串处理测试通过');
    console.log(`  结果: ${result}`);
  } catch (error) {
    console.error('✗ 字符串处理测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 6: 中文函数名
console.log('\n测试 6: 中文函数名');
async function testChineseFunctionName() {
  try {
    const v = createVibe();
    const result = await v.加法(5, 7)(z.number());
    console.log('✓ 中文函数名测试通过');
    console.log(`  结果: ${result}`);
  } catch (error) {
    console.error('✗ 中文函数名测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 7: 链式调用支持
console.log('\n测试 7: 链式调用');
async function testChainedCall() {
  try {
    const v = createVibe();
    
    // 不带 schema
    const result1 = await v.add(3, 4);
    console.log('  无 schema: ✓');
    
    // 带 schema
    const result2 = await v.add(3, 4)(z.number());
    console.log('  有 schema: ✓');
    
    console.log('✓ 链式调用测试通过');
  } catch (error) {
    console.error('✗ 链式调用测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 测试 8: vibeUtils
console.log('\n测试 8: vibeUtils');
async function testVibeUtils() {
  try {
    const logs = await vibeUtils.readLogs();
    console.log(`  读取日志: ${logs.length} 条 ✓`);
    
    await vibeUtils.clearCache();
    console.log('  清除缓存: ✓');
    
    await vibeUtils.clearLogs();
    console.log('  清除日志: ✓');
    
    console.log('✓ vibeUtils 测试通过');
  } catch (error) {
    console.error('✗ vibeUtils 测试失败');
    console.error(`  错误: ${error}`);
  }
}

// 运行所有测试
(async () => {
  await testBasicFunctionCall();
  await testWithSchema();
  await testCache();
  await testDecorator();
  await testStringProcessing();
  await testChineseFunctionName();
  await testChainedCall();
  await testVibeUtils();
  console.log('\n=== 测试完成 ===');
})();
