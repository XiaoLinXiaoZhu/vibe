/**
 * 将领战棋 - 使用vibe生成的策略游戏
 *
 * 这个游戏展示了如何使用vibe库动态生成游戏内容：
 * - 将领及其技能由LLM生成
 * - 敌人由LLM生成
 * - 战斗效果由LLM计算
 * - 敌人AI决策由LLM决定
 *
 * 启动方式：
 * 1. 设置环境变量：export LLM_API_KEY=your_api_key
 * 2. 运行服务器：bun run game-server
 * 3. 打开浏览器访问：http://localhost:3000/index.html
 */

import { createVibe } from '../../index';
import { z } from 'zod';

// 创建vibe实例（用于演示API调用）
const v = createVibe({
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL || 'gpt-4',
  baseUrl: process.env.LLM_BASE_URL
});

/**
 * 示例1：生成一个将领
 */
async function exampleGenerateGeneral() {
  console.log('\n=== 示例1：生成一个将领 ===\n');
  
  const general = await v.生成一个游戏将领({
    攻击类型: '攻击型',
    职业: '战士',
    主题: '火焰'
  })(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
    stats: z.object({
      hp: z.number(),
      attack: z.number(),
      defense: z.number(),
      speed: z.number()
    }),
    skills: z.array(z.object({
      name: z.string(),
      description: z.string(),
      type: z.enum(['attack', 'defense', 'support', 'special']),
      cooldown: z.number(),
      currentCooldown: z.number()
    }))
  }));
  
  console.log('生成的将领:', JSON.stringify(general, null, 2));
}

/**
 * 示例2：生成一个Boss
 */
async function exampleGenerateBoss() {
  console.log('\n=== 示例2：生成一个Boss ===\n');
  
  const boss = await v.生成一个boss怪物({
    层数: 'game-level-1',
    boss风格: '古代神话风格',
    主题: '火焰主题'
  })(z.object({
    name: z.string(),
    description: z.string(),
    buffs: z.array(z.object({
      name: z.string(),
      description: z.string(),
      effect: z.string()
    }))
  }));
  
  console.log('生成的Boss:', JSON.stringify(boss, null, 2));
}

/**
 * 示例3：计算攻击伤害
 */
async function exampleCalculateDamage() {
  console.log('\n=== 示例3：计算攻击伤害 ===\n');
  
  const damage = await v.计算攻击伤害({
    攻击者攻击力: 100,
    防御者防御力: 50,
    攻击者速度: 20,
    防御者速度: 15,
    是否是Boss战: false
  })(z.object({
    damage: z.number(),
    description: z.string()
  }));
  
  console.log('计算结果:', JSON.stringify(damage, null, 2));
}

/**
 * 示例4：执行技能效果
 */
async function exampleExecuteSkill() {
  console.log('\n=== 示例4：执行技能效果 ===\n');
  
  const skillEffect = await v.执行技能效果({
    技能类型: 'attack',
    技能名称: '火焰爆裂',
    施法者单位: {
      id: 'player-1',
      name: '火焰战士',
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      attack: 80,
      defense: 60,
      speed: 20,
      skills: [],
      isPlayer: true
    },
    敌人单位列表: [
      {
        id: 'enemy-1',
        name: '黑暗骑士',
        x: 3,
        y: 1,
        hp: 150,
        maxHp: 150,
        attack: 70,
        defense: 70,
        speed: 15,
        skills: [],
        isPlayer: false
      }
    ],
    友军单位列表: [
      {
        id: 'player-2',
        name: '冰霜法师',
        x: 0,
        y: 1,
        hp: 80,
        maxHp: 80,
        attack: 90,
        defense: 50,
        speed: 25,
        skills: [],
        isPlayer: true
      }
    ]
  })(z.object({
    description: z.string(),
    damage: z.number().optional(),
    heal: z.number().optional(),
    buffs: z.array(z.string()).optional()
  }));
  
  console.log('技能效果:', JSON.stringify(skillEffect, null, 2));
}

/**
 * 示例5：决定敌人行动
 */
async function exampleEnemyAI() {
  console.log('\n=== 示例5：决定敌人行动 ===\n');
  
  const action = await v.决定敌人行动({
    敌人单位: {
      id: 'enemy-1',
      name: '黑暗骑士',
      x: 3,
      y: 1,
      hp: 150,
      maxHp: 150,
      attack: 70,
      defense: 70,
      speed: 15,
      skills: [],
      isPlayer: false
    },
    玩家单位列表: [
      {
        id: 'player-1',
        name: '火焰战士',
        x: 1,
        y: 0,
        hp: 100,
        maxHp: 100,
        attack: 80,
        defense: 60,
        speed: 20,
        skills: [],
        isPlayer: true
      },
      {
        id: 'player-2',
        name: '冰霜法师',
        x: 0,
        y: 1,
        hp: 80,
        maxHp: 80,
        attack: 90,
        defense: 50,
        speed: 25,
        skills: [],
        isPlayer: true
      }
    ],
    战场信息: { width: 4, height: 5 }
  })(z.object({
    type: z.enum(['attack', 'move', 'wait']),
    targetId: z.string().optional(),
    targetX: z.number().optional(),
    targetY: z.number().optional(),
    description: z.string()
  }));
  
  console.log('敌人AI决策:', JSON.stringify(action, null, 2));
}

/**
 * 运行所有示例
 */
async function runExamples() {
  try {
    await exampleGenerateGeneral();
    await exampleGenerateBoss();
    await exampleCalculateDamage();
    await exampleExecuteSkill();
    await exampleEnemyAI();
    
    console.log('\n✅ 所有示例运行完成！');
    console.log('\n要启动完整游戏，请运行：');
    console.log('  bun run game-server');
    console.log('  然后在浏览器中打开 http://localhost:3000/index.html');
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件，执行示例
// @ts-ignore - import.meta.main 是Bun特有的属性
if (import.meta.main as unknown as boolean) {
  runExamples();
}

export { runExamples };
