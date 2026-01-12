import { createVibe } from './index.js';

console.log('=== 测试 LLM 日志记录 ===\n');

const v = createVibe();

// 清空之前的日志，方便查看
await v.clearLogs();
console.log('已清空日志\n');

// 测试 1: 调用一个新函数（会触发 LLM 调用）
console.log('测试 1: 调用新函数 add(5, 3)');
const result1 = await v.add(5, 3);
console.log(`结果: ${result1}\n`);

// 测试 2: 再次调用相同函数（会使用缓存）
console.log('测试 2: 再次调用 add(5, 3) - 应该使用缓存');
const result2 = await v.add(5, 3);
console.log(`结果: ${result2}\n`);

// 测试 3: 调用另一个新函数
console.log('测试 3: 调用新函数 multiply(4, 6)');
const result3 = await v.multiply(4, 6);
console.log(`结果: ${result3}\n`);

// 读取并显示日志
console.log('=== 读取日志 ===\n');
const logs = await v.readLogs();
console.log(`总共 ${logs.length} 条日志\n`);

logs.forEach((log, index) => {
  console.log(`【日志 ${index + 1}】`);
  console.log(`  函数名: ${log.functionName}`);
  console.log(`  参数: ${JSON.stringify(log.args)}`);
  console.log(`  缓存: ${log.fromCache ? '✓' : '✗'}`);
  console.log(`  耗时: ${log.executionTime}ms`);
  
  if (!log.fromCache && log.llmRequest) {
    console.log(`  \n  [LLM 调用]`);
    console.log(`    模型: ${log.llmRequest.model}`);
    console.log(`    用户提示词:\n${log.llmRequest.userPrompt}\n`);
  }
  
  if (!log.fromCache && log.llmResponse) {
    console.log(`  [LLM 响应]`);
    console.log(`    原始内容: ${log.llmResponse.rawContent}`);
    if (log.llmResponse.usage) {
      console.log(`    Token: ${log.llmResponse.usage.promptTokens}+${log.llmResponse.usage.completionTokens}=${log.llmResponse.usage.totalTokens}`);
    }
  }
  
  console.log(`  生成代码: ${log.code || '(空)'}`);
  console.log(`  结果: ${JSON.stringify(log.result)}`);
  console.log('');
});

console.log('=== 测试完成 ===');
