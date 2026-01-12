import { createVibe } from '../index.js';
import { z } from 'zod';

const v = createVibe();
const characters = ["Alice","Bob","Charlie","David","Eve","Frank","George","Harry","Ivy","Jack","Kate","Liam","Mia","Noah","Olivia","Pam","Quinn","Ryan","Sarah","Thomas","Uma","Violet","William","Xavier","Yara","Zane","初音未来","镜音铃","镜音连","巡音流歌","Teto"];

// 测试 1: fuckWho 基础功能
test('fuckWho: 选择两个人物', async () => {
  console.log('\n=== 演示: fuckWho 选择两个人物 ===');
  const result = await v.fuck('Bob', 'Bob');
  console.log(`v.fuck("Alice", "Bob") = ${result}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 2: fuckWho 使用字符数组
test('fuckWho: 使用字符数组选择', async () => {
  console.log('\n=== 演示: fuckWho 使用字符数组 ===');
  const result = await v.fuckWho(characters)(z.string());
  console.log(`v.fuckWho(characters)(z.string()) = ${result}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 3: whoAreYou 基础功能
test('whoAreYou: 你是谁', async () => {
  console.log('\n=== 演示: whoAreYou 你是谁 ===');
  const result = await v.whoAreYou();
  console.log(`v.whoAreYou(characters) = ${result}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 4: whoAmI 基础功能
test('whoAmI: 我是谁', async () => {
  console.log('\n=== 演示: whoAmI 我是谁 ===');
  const result = await v.whoAmI();
  console.log(`v.whoAmI(characters)(z.string()) = ${result}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 5: 排序功能
test('排序: 数字数组排序', async () => {
  console.log('\n=== 演示: 数字数组排序 ===');
  const result = await v.排序([1,5,100,20,4])(z.array(z.number()));
  console.log(`v.排序([1,5,10,2,4])(z.array(z.number())) = ${JSON.stringify(result)}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 6: 胸部大小排序
test('胸部大小排序: 角色排序', async () => {
  console.log('\n=== 演示: 胸部大小排序 ===');
  const result = await v.胸部大小排序(characters)(z.array(z.string()));
  console.log(`v.胸部大小排序(characters)(z.array(z.string())) = ${JSON.stringify(result)}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 7: 角色扮演
test('角色扮演: 猫娘回复', async () => {
  console.log('\n=== 演示: 角色扮演 - 猫娘 ===');
  const result = await v["从现在开始，你是一个猫娘，你需要对我的消息做出回复"]("你今天怎么样？")(z.string());
  console.log(`v["从现在开始，你是一个猫娘，你需要对我的消息做出回复"]("你今天怎么样？")(z.string()) = ${result}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);

// 测试 8: fuckWithWhoAndTimes 复杂对象
test('fuckWithWhoAndTimes: 复杂对象操作', async () => {
  console.log('\n=== 演示: fuckWithWhoAndTimes 复杂对象 ===');
  const result = await v.fuckWithWhoAndTimes(characters)(z.object({who: z.string(), times: z.number()}));
  console.log(`v.fuckWithWhoAndTimes(characters)(z.object({who: z.string(), times: z.number()})) = ${JSON.stringify(result)}`);
  console.log('=== 演示完成 ===\n');
  expect(result).toBeDefined();
}, 300000);
