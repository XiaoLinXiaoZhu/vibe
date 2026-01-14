import { createVibe } from '../index.js';
import { z } from 'zod';

/**
 * 全局对象使用示例
 * 展示 AI 如何使用 v 和 z 来实现复杂功能
 */

const v = createVibe();

console.log('=== 全局对象使用示例 ===\n');

// 示例 1: 基础函数组合
console.log('示例 1: 计算圆形面积');
console.log('AI 可能会分解为: 计算半径平方 -> 乘以 π');
const area = await v.calculateCircleArea(5);
console.log('圆形面积 (r=5):', area, '\n');

// 示例 2: 字符串处理流程
console.log('示例 2: 处理用户输入');
console.log('AI 可能会: 清理空格 -> 转小写 -> 验证格式');
const processed = await v.processUserInput('  Hello World  ');
console.log('处理后:', processed, '\n');

// 示例 3: 数据转换管道
console.log('示例 3: 数据转换管道');
const pipelineSchema = z.object({
  doubled: z.array(z.number()),
  sum: z.number(),
  average: z.number()
});
const pipeline = await v.numbersPipeline([1, 2, 3, 4, 5])(pipelineSchema);
console.log('管道结果:', pipeline, '\n');

// 示例 4: 复杂对象构建
console.log('示例 4: 生成用户档案');
const profileSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  age: z.number(),
  interests: z.array(z.string()),
  bio: z.string()
});
const profile = await v.generateUserProfile('Alice', 25, ['coding', 'music'])(profileSchema);
console.log('用户档案:', profile, '\n');

// 示例 5: 中文函数 + 递归调用
console.log('示例 5: 复杂的中文函数调用');
console.log('emoji 转字符画可能需要多个步骤');
const art = await v.将emoji转化为字符画('❤️', 8, 8);
console.log('字符画结果:');
console.log(art, '\n');

// 示例 6: 条件分支处理
console.log('示例 6: 智能路由函数');
console.log('根据输入类型调用不同的处理函数');
const routed1 = await v.smartRouter('number', 42);
const routed2 = await v.smartRouter('string', 'hello');
console.log('路由结果 (number):', routed1);
console.log('路由结果 (string):', routed2, '\n');

// 示例 7: 使用 zod 在 AI 代码中验证
console.log('示例 7: AI 代码内部使用 zod');
console.log('AI 生成的代码可以用 z 验证中间结果');
const validated = await v.validateAndProcess({ name: 'test', value: 123 });
console.log('验证后处理:', validated, '\n');

console.log('=== 全局对象示例完成 ===');
console.log('\n提示：查看 .vibe/logs 可以看到 AI 生成的实际代码');
