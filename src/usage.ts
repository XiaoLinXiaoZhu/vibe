import { createVibe, vibeUtils, VibeClass, vibeFn } from './index.js';
import { z } from 'zod';

const v = createVibe();

// 基础调用
const sum = await v.add(5, 3);
console.log(sum); // 8

// 中文函数名
const sum2 = await v.加法(10, 20);
console.log(sum2); // 30

// 带类型验证
const schema = z.object({ name: z.string(), age: z.number() });
const person = await v.createPerson('Alice', 25)(schema);
console.log(person);

// 实用方法
await vibeUtils.clearCache();
const logs = await vibeUtils.readLogs();

// 装饰器
@VibeClass()
class Calculator {
  @vibeFn
  multiply(a: number, b: number): any {
    return;
  }
}

const calc = new Calculator();
const product = await calc.multiply(6, 7);
console.log(product); // 42
