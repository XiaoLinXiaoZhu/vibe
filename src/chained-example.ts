import { createVibe } from './index.js';
import { z } from 'zod';

console.log('=== 链式调用示例 ===\n');

const v = createVibe();

// 示例 1: 直接调用（无 schema）
console.log('示例 1: 直接调用');
const result1 = await v.add(10, 20);
console.log(`v.add(10, 20) = ${result1}\n`);

// 示例 2: 链式调用（带 schema）
console.log('示例 2: 链式调用');
const numberSchema = z.number();
const result2 = await v.subtract(20, 5)(numberSchema);
console.log(`v.subtract(20, 5)(z.number()) = ${result2}\n`);

// 示例 3: 复杂的中文函数名
console.log('示例 3: 中文函数名');
const stringSchema = z.string();
const result3 = await v.将字符串反转成大写('hello world')(stringSchema);
console.log(`v.将字符串反转成大写('hello world') = ${result3}\n`);

// 示例 4: Emoji 转字符画
console.log('示例 4: Emoji 转字符画');
const result4 = await v.将emoji转化为字符画('👀', '200', '200')(stringSchema);
console.log(`v.将emoji转化为字符画('👀', '200', '200'):`);
console.log(result4);
console.log('');

// 示例 5: 多个参数 + schema
console.log('示例 5: 多个参数 + schema');
const personSchema = z.object({
  fullName: z.string(),
  yearOfBirth: z.number(),
});
const result5 = await v.创建个人信息('张三', 1990)(personSchema);
console.log('v.创建个人信息("张三", 1990):');
console.log(result5);
console.log('');

console.log('=== 示例完成 ===');
