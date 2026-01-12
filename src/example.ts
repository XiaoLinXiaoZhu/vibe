import { createVibe, vibeUtils, VibeClass, vibeFn } from './index.js';
import { z } from 'zod';

console.log('=== Vibe 示例 ===\n');

// 示例 1: 使用 createVibe 创建实例
console.log('示例 1: 使用 createVibe 创建实例');
const v = createVibe();

// 计算两个数的和
console.log('\n调用 v.add(5, 3)');
const result1 = await v.add(5, 3);
console.log(`结果: ${result1}`);

// 字符串反转
console.log('\n调用 v.reverseString("hello")');
const result2 = await v.reverseString('hello');
console.log(`结果: ${result2}`);

// 示例 2: 使用 zod schema 验证输出类型
console.log('\n\n示例 2: 使用 zod schema 验证输出类型');

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

console.log('\n调用 v.createPerson("Alice", 25) 并使用 zod 验证');
const personResult = await v.createPerson('Alice', 25)(personSchema);
console.log('验证通过:', personResult);

// 示例 3: 使用中文函数名
console.log('\n\n示例 3: 使用中文函数名');
console.log('调用 v.将emoji转化为字符画("👀", "200", "200")');
const asciiArt = await v.将emoji转化为字符画('👀', '200', '200')(z.string());
console.log('结果:', asciiArt);

// 示例 4: 使用装饰器
console.log('\n\n示例 4: 使用装饰器');

@VibeClass()
class Calculator {
  @vibeFn
  multiply(a: number, b: number): any {
    // 这个方法会被 LLM 生成的代码替换
    return;
  }

  @vibeFn
  factorial(n: number): any {
    // 这个方法会被 LLM 生成的代码替换
    return;
  }
}

const calc = new Calculator();
console.log('\n调用 calc.multiply(6, 7)');
const product = await calc.multiply(6, 7);
console.log(`结果: ${product}`);

console.log('\n调用 calc.factorial(5)');
const fact = await calc.factorial(5);
console.log(`结果: ${fact}`);

// 示例 5: 使用 vibeUtils
console.log('\n\n示例 5: 使用 vibeUtils');
console.log('读取日志');
const logs = await vibeUtils.readLogs();
console.log(`找到 ${logs.length} 条日志记录`);

console.log('\n清除缓存');
await vibeUtils.clearCache();
console.log('缓存已清除');

console.log('\n\n=== 示例完成 ===');
