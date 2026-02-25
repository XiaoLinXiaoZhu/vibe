import { createVibe } from '../index.js';
import { z } from 'zod';

/**
 * 测试方括号调用方式
 */

const v = createVibe();

// 测试基础方括号调用
console.log('测试 1: v["add"](5, 3)');
const sum1 = await v["add"](5, 3);
console.log('结果:', sum1);

// 测试点号调用（对比）
console.log('\n测试 2: v.add(5, 3)');
const sum2 = await v.add(5, 3);
console.log('结果:', sum2);

// 测试方括号 + 中文函数名
console.log('\n测试 3: v["加法"](10, 20)');
const sum3 = await v["加法"](10, 20);
console.log('结果:', sum3);

// 测试方括号 + schema
console.log('\n测试 4: v["getUserInfo"]("Alice", 25)(schema)');
const userSchema = z.object({ 
  name: z.string(), 
  age: z.number() 
});
const user1 = await v["getUserInfo"]('Alice', 25)(userSchema);
console.log('结果:', user1);

// 测试点号 + schema（对比）
console.log('\n测试 5: v.getUserInfo("Bob", 30)(schema)');
const user2 = await v.getUserInfo('Bob', 30)(userSchema);
console.log('结果:', user2);

// 测试动态函数名
console.log('\n测试 6: 动态函数名');
const functionName = 'multiply';
const result = await v[functionName](6, 7);
console.log('结果:', result);

// 测试带空格或特殊字符的函数名
console.log('\n测试 7: 特殊函数名');
const specialResult = await v["calculate total price"](100, 0.2);
console.log('结果:', specialResult);

// 测试 withSchema 方法
console.log('\n测试 8: v["createObject"](...).withSchema(schema)');
const objSchema = z.object({
  id: z.number(),
  value: z.string()
});
const obj = await v["createObject"](1, 'test').withSchema(objSchema);
console.log('结果:', obj);

console.log('\n✅ 所有方括号调用测试完成！');
