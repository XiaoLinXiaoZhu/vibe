import { createVibe } from './index.js';

console.log('=== Vibe 日志示例 ===\n');

const v = createVibe();

// 示例 1: 基本函数调用
console.log('示例 1: 基本函数调用');
const result1 = await v.add(10, 20);
console.log(`v.add(10, 20) = ${result1}\n`);

// 示例 2: 字符串处理
console.log('示例 2: 字符串处理');
const result2 = await v.reverseString('hello world');
console.log(`v.reverseString('hello world') = ${result2}\n`);

// 示例 3: 再次调用相同函数（应该使用缓存）
console.log('示例 3: 再次调用相同函数（应该使用缓存）');
const result3 = await v.add(10, 20);
console.log(`v.add(10, 20) = ${result3}\n`);

// 示例 4: 阅读日志
console.log('示例 4: 阅读今天的日志');
const logs = await v.readLogs();
console.log(`找到 ${logs.length} 条日志记录\n`);

// 显示最近的日志
console.log('最近的 3 条日志记录:');
logs.slice(-3).forEach((log, index) => {
  console.log(`\n--- 日志 ${index + 1} ---`);
  console.log(`函数名: ${log.functionName}`);
  console.log(`参数: ${JSON.stringify(log.args)}`);
  console.log(`是否缓存: ${log.fromCache ? '是' : '否'}`);
  console.log(`执行时间: ${log.executionTime}ms`);
  console.log(`成功: ${log.success ? '是' : '否'}`);
  
  // 显示 LLM 请求（如果有）
  if (log.llmRequest) {
    console.log(`\n[LLM 请求]`);
    console.log(`模型: ${log.llmRequest.model}`);
    console.log(`温度: ${log.llmRequest.temperature}`);
    console.log(`最大 tokens: ${log.llmRequest.maxTokens}`);
    console.log(`系统提示词: ${log.llmRequest.systemPrompt.substring(0, 150)}...`);
    console.log(`用户提示词: ${log.llmRequest.userPrompt.substring(0, 200)}...`);
  }
  
  // 显示 LLM 响应（如果有）
  if (log.llmResponse) {
    console.log(`\n[LLM 响应]`);
    console.log(`原始内容: ${log.llmResponse.rawContent}`);
    console.log(`结束原因: ${log.llmResponse.finishReason || 'N/A'}`);
    if (log.llmResponse.usage) {
      console.log(`Token 使用: ${log.llmResponse.usage.promptTokens} (提示) + ${log.llmResponse.usage.completionTokens} (完成) = ${log.llmResponse.usage.totalTokens} (总计)`);
    }
  }
  
  if (log.code) {
    console.log(`\n生成代码: ${log.code}`);
  }
  
  if (log.result !== undefined) {
    console.log(`结果: ${JSON.stringify(log.result)}`);
  }
});

console.log('\n\n=== 示例完成 ===');
