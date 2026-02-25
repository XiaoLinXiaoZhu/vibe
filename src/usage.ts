import { createVibe, vibeUtils } from './index.js';
import { z } from 'zod';

const v = createVibe();

// 基础调用
const sum = await v.add(5, 3);
console.log(sum); // 8

// 方括号调用方式
const sum3 = await v["add"](5, 3);
console.log(sum3); // 8

// 中文函数名
const sum2 = await v.加法(10, 20);
console.log(sum2); // 30

// 方括号调用中文函数名
const sum4 = await v["加法"](10, 20);
console.log(sum4); // 30

// 带类型验证
const schema = z.object({ name: z.string(), age: z.number() });
const person = await v.createPerson('Alice', 25)(schema);
console.log(person);

// 方括号调用 + schema
const person2 = await v["createPerson"]('Bob', 30)(schema);
console.log(person2);

// 动态函数名调用
const funcName = 'multiply';
const result = await v[funcName](3, 7);
console.log(result); // 21

// 实用方法
await vibeUtils.clearCache();
const logs = await vibeUtils.readLogs();
