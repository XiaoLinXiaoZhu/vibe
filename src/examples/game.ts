/**
 * 文字冒险游戏示例 - 抽象版本
 * 外部只负责：初始化、渲染、接受输入
 * 所有游戏逻辑都交给 vibe 函数
 */

import { createVibe } from '../index';
import * as readline from 'readline';

// 初始化 vibe
const v = createVibe({ strict: true });

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 读取用户输入的辅助函数
 */
function readUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 渲染函数 - 外部只负责显示
 */
async function render(text: string) {
  console.log(text);
}

/**
 * 获取用户输入 - 外部只负责接收
 */
async function getInput(): Promise<string> {
  return await readUserInput('');
}

/**
 * 主函数 - 只负责初始化和连接各个组件
 */
async function main() {
  // 初始化游戏状态（由 vibe 函数处理）
  const initialState = await v.初始化游戏();

  // 游戏主循环（完全由 vibe 函数控制）
  const result = await v.游戏主循环(initialState, render, getInput);

  // 游戏结束，显示最终结果
  await render('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await render(result);
  
  // 关闭资源
  rl.close();
}

// 启动游戏
main().catch(console.error);
