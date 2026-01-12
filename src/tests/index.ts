import { testBasic } from './basic.test.js';
import { testChained } from './chained.test.js';
import { testChinese } from './chinese.test.js';
import { testCache } from './cache.test.js';
import { testDecorator } from './decorator.test.js';
import { testUtils } from './utils.test.js';

console.log('\n╔══════════════════════════════════════════╗');
console.log('║        Vibe 完整测试套件                ║');
console.log('╚══════════════════════════════════════════╝\n');

async function runTests() {
  try {
    await testBasic();
    await testChained();
    await testChinese();
    await testCache();
    await testDecorator();
    await testUtils();

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║         所有测试通过 ✓                    ║');
    console.log('╚══════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════╗');
    console.error('║         测试失败 ✗                        ║');
    console.error(`║  错误: ${error}                              ║`);
    console.log('╚══════════════════════════════════════════╝\n');
    throw error;
  }
}

await runTests();
