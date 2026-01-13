// 游戏后端服务器 - 使用vibe生成游戏内容

import express from 'express';
import { createVibe } from '../../index';
import { z } from 'zod';
import type {
  GameState,
  General,
  BattleState,
  Unit,
  BossInfo,
  GeneralStats,
  Skill
} from './types';

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Debug 配置
const DEBUG = process.env.DEBUG === 'true' || true;

// Debug 日志函数
function debugLog(...args: any[]) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG]`, ...args);
  }
}

// Debug 错误函数
function debugError(...args: any[]) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR]`, ...args);
  }
}

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  debugLog(`[${req.method}] ${req.path}`, {
    body: req.body,
    query: req.query
  });

  // 拦截响应
  const originalSend = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    debugLog(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`, {
      response: data
    });
    return originalSend.call(this, data);
  };

  next();
});

// 创建vibe实例
const v = createVibe({
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL || 'gpt-4',
  baseUrl: process.env.LLM_BASE_URL
});

debugLog('Vibe 实例创建成功', {
  model: process.env.LLM_MODEL || 'gpt-4',
  baseUrl: process.env.LLM_BASE_URL
});

// 游戏状态存储
let gameStates: Map<string, GameState> = new Map();
let gameState: GameState | null = null;

// ==================== Schema定义 ====================

const GeneralSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  skills: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['attack', 'defense', 'support', 'special']),
    cooldown: z.number(),
    currentCooldown: z.number()
  })),
  stats: z.object({
    hp: z.number(),
    attack: z.number(),
    defense: z.number(),
    speed: z.number()
  }),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary'])
});

const BossSchema = z.object({
  name: z.string(),
  description: z.string(),
  buffs: z.array(z.object({
    name: z.string(),
    description: z.string(),
    effect: z.string()
  }))
});

const UnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  attack: z.number(),
  defense: z.number(),
  speed: z.number(),
  skills: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['attack', 'defense', 'support', 'special']),
    cooldown: z.number(),
    currentCooldown: z.number()
  })),
  isPlayer: z.boolean()
});

// ==================== API路由 ====================

// Debug: 获取游戏状态
app.get('/api/debug/state', (req, res) => {
  debugLog('获取游戏状态请求');
  res.json({
    debug: true,
    timestamp: new Date().toISOString(),
    gameState: gameState ? {
      currentLayer: gameState.currentLayer,
      currentLevel: gameState.currentLevel,
      generalsCount: gameState.generals.length,
      selectedGeneralsCount: gameState.selectedGenerals.length,
      availableGeneralsCount: gameState.availableGenerals.length,
      inBattle: !!gameState.currentBattle,
      battleInfo: gameState.currentBattle ? {
        currentTurn: gameState.currentBattle.currentTurn,
        playerUnitsCount: gameState.currentBattle.playerUnits.length,
        enemyUnitsCount: gameState.currentBattle.enemyUnits.length,
        currentWave: gameState.currentBattle.currentWave,
        isBossBattle: gameState.currentBattle.isBossBattle
      } : null
    } : null,
    memoryUsage: process.memoryUsage()
  });
});

// Debug: 重置游戏状态
app.post('/api/debug/reset', (req, res) => {
  debugLog('重置游戏状态请求');
  gameState = null;
  res.json({ success: true, message: '游戏状态已重置' });
});

// Debug: 设置特定层数和关卡
app.post('/api/debug/setLevel', (req, res) => {
  const { layer, level } = req.body;
  debugLog('设置关卡请求', { layer, level });

  if (!gameState) {
    return res.status(400).json({ error: '游戏未开始' });
  }

  gameState.currentLayer = layer;
  gameState.currentLevel = level;
  res.json({ success: true, message: `已设置到第 ${layer} 层第 ${level} 关` });
});

// Debug: 查看所有游戏状态
app.get('/api/debug/allStates', (req, res) => {
  debugLog('查看所有游戏状态请求');
  const allStates: any[] = [];
  gameStates.forEach((state, key) => {
    allStates.push({
      id: key,
      currentLayer: state.currentLayer,
      currentLevel: state.currentLevel,
      generalsCount: state.generals.length
    });
  });
  res.json({
    debug: true,
    totalStates: gameStates.size,
    states: allStates
  });
});

// 开始游戏
app.post('/api/game/start', async (req, res) => {
  try {
    debugLog('开始新游戏');

    // 使用vibe生成每层的boss风格
    debugLog('生成Boss风格...');
    const bosses = await Promise.all([
      v.生成一个boss风格描述({
        层数: 'game-level-1',
        风格描述: '古代神话风格',
        主题: '火焰主题'
      })(z.string()),
      v.生成一个boss风格描述({
        层数: 'game-level-2',
        风格描述: '未来科技风格',
        主题: '机械主题'
      })(z.string()),
      v.生成一个boss风格描述({
        层数: 'game-level-3',
        风格描述: '宇宙恐怖风格',
        主题: '虚空主题'
      })(z.string())
    ]);

    debugLog('Boss风格生成完成', { bosses });

    gameState = {
      currentLayer: 1,
      currentLevel: 1,
      bosses: bosses as any,
      generals: [],
      selectedGenerals: [],
      availableGenerals: [],
      currentBattle: null
    };

    debugLog('游戏状态初始化完成', {
      currentLayer: gameState.currentLayer,
      currentLevel: gameState.currentLevel
    });

    res.json(gameState);
  } catch (error) {
    debugError('启动游戏失败', error);
    res.status(500).json({ error: '启动游戏失败' });
  }
});

// 获取可选将领
app.get('/api/game/generals/available', async (req, res) => {
  try {
    // 使用vibe生成3个可选将领
    const generals = await Promise.all([
      v.生成一个游戏将领的信息({
        攻击类型: '攻击型',
        职业: '战士',
        主题: '火焰'
      })(GeneralSchema),
      v.生成一个游戏将领的信息({
        攻击类型: '防御型',
        职业: '法师',
        主题: '冰霜'
      })(GeneralSchema),
      v.生成一个游戏将领的信息({
        攻击类型: '辅助型',
        职业: '射手',
        主题: '雷电'
      })(GeneralSchema)
    ]);

    gameState!.availableGenerals = generals as any;
    res.json(generals);
  } catch (error) {
    console.error('获取可用将领失败:', error);
    res.status(500).json({ error: '获取可用将领失败' });
  }
});

// 选择将领
app.post('/api/game/generals/select', async (req, res) => {
  try {
    const { index } = req.body;
    const selectedGeneral = gameState!.availableGenerals[index];

    if (gameState!.generals.length >= 4) {
      // 需要删除一个将领（简化处理，随机删除）
      gameState!.generals.pop();
    }

    gameState!.generals.push(selectedGeneral);
    
    res.json({ 
      success: true, 
      general: selectedGeneral,
      allGenerals: gameState!.generals 
    });
  } catch (error) {
    console.error('选择将领失败:', error);
    res.status(500).json({ error: '选择将领失败', success: false, message: '选择将领失败' });
  }
});

// 开始战斗
app.post('/api/game/battle/start', async (req, res) => {
  try {
    const { generals } = req.body;
    const currentLayer = gameState!.currentLayer;
    const currentLevel = gameState!.currentLevel;
    
    // 判断是否是boss战
    const isBossBattle = currentLevel === 4;
    
    // 创建玩家单位
    const playerUnits = generals.map((g: General, i: number) => ({
      id: `player-${i}`,
      name: g.name,
      x: 0, // 玩家从左侧开始
      y: i,
      hp: g.stats.hp,
      maxHp: g.stats.hp,
      attack: g.stats.attack,
      defense: g.stats.defense,
      speed: g.stats.speed,
      skills: g.skills,
      isPlayer: true
    }));

    // 使用vibe生成敌人
    const enemyCount = isBossBattle ? 1 : Math.floor(Math.random() * 3) + 2;
    let enemyUnits: Unit[];
    
    if (isBossBattle) {
      // Boss战 - 使用vibe生成boss
      const boss = await v.生成一个boss怪物({
        层数: `game-level-${currentLayer}`,
        boss风格: gameState!.bosses[currentLayer - 1],
        玩家单位数量: playerUnits.length
      })(BossSchema);
      
      enemyUnits = [{
        id: 'boss',
        name: (boss as any).name,
        x: 3,
        y: 2,
        hp: 500,
        maxHp: 500,
        attack: 80,
        defense: 60,
        speed: 10,
        skills: [],
        isPlayer: false
      }];
    } else {
      // 普通战斗 - 使用vibe生成敌人
      enemyUnits = await Promise.all(
        Array.from({ length: enemyCount }, async (_, i) => {
          const enemy = await v.生成一个普通敌人({
            层数: `game-level-${currentLayer}`,
            敌人名称: `敌人${i + 1}`,
            当前关卡: currentLevel
          })(UnitSchema);
          return {
            ...(enemy as any),
            x: 3,
            y: i,
            isPlayer: false
          };
        })
      );
    }

    const battleState: BattleState = {
      battlefield: { width: 4, height: 5 },
      playerUnits,
      enemyUnits,
      currentWave: 1,
      totalWaves: 3,
      currentTurn: 'player',
      selectedUnit: null,
      isBossBattle,
      boss: isBossBattle ? {
        name: enemyUnits[0].name,
        description: '强大的boss',
        buffs: []
      } : undefined
    };

    gameState!.currentBattle = battleState;
    res.json(battleState);
  } catch (error) {
    console.error('开始战斗失败:', error);
    res.status(500).json({ error: '开始战斗失败' });
  }
});

// 移动单位
app.post('/api/game/battle/move', async (req, res) => {
  try {
    const { unitId, targetX, targetY } = req.body;
    const battleState = gameState!.currentBattle!;
    
    // 查找单位
    const unit = battleState.playerUnits.find(u => u.id === unitId);
    if (!unit) {
      return res.json({ success: false, message: '单位不存在' });
    }
    
    // 检查是否是玩家回合
    if (battleState.currentTurn !== 'player') {
      return res.json({ success: false, message: '不是玩家回合' });
    }
    
    // 计算移动距离
    const distance = Math.abs(targetX - unit.x) + Math.abs(targetY - unit.y);
    const maxMove = Math.floor(unit.speed / 10);
    
    if (distance > maxMove) {
      return res.json({ success: false, message: '移动距离过大' });
    }
    
    // 检查目标位置是否有单位
    const hasUnit = battleState.playerUnits.some(u => u.x === targetX && u.y === targetY) ||
                     battleState.enemyUnits.some(u => u.x === targetX && u.y === targetY);
    
    if (hasUnit) {
      return res.json({ success: false, message: '目标位置已有单位' });
    }
    
    // 移动单位
    unit.x = targetX;
    unit.y = targetY;
    
    res.json({ success: true, battleState });
  } catch (error) {
    console.error('移动失败:', error);
    res.status(500).json({ error: '移动失败' });
  }
});

// 攻击敌人
app.post('/api/game/battle/attack', async (req, res) => {
  try {
    const { attackerId, targetId } = req.body;
    const battleState = gameState!.currentBattle!;
    
    // 查找攻击者和目标
    const attacker = battleState.playerUnits.find(u => u.id === attackerId);
    const target = battleState.enemyUnits.find(u => u.id === targetId);
    
    if (!attacker || !target) {
      return res.json({ success: false, message: '单位不存在' });
    }
    
    // 计算伤害
    const distance = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    const attackRange = 1; // 默认攻击距离
    
    if (distance > attackRange) {
      return res.json({ success: false, message: '攻击距离不足' });
    }
    
    // 使用vibe计算伤害
    const damage = await v.计算攻击伤害({
      攻击者攻击力: attacker.attack,
      防御者防御力: target.defense,
      攻击者速度: attacker.speed,
      防御者速度: target.speed,
      是否是Boss战: battleState.isBossBattle
    })(z.number());
    
    // 扣除目标HP
    target.hp -= Math.floor(damage as any);
    
    // 检查是否死亡
    if (target.hp <= 0) {
      battleState.enemyUnits = battleState.enemyUnits.filter(u => u.id !== targetId);
    }
    
    res.json({ success: true, battleState, damage });
  } catch (error) {
    console.error('攻击失败:', error);
    res.status(500).json({ error: '攻击失败' });
  }
});

// 使用技能
app.post('/api/game/battle/skill', async (req, res) => {
  try {
    const { unitId } = req.body;
    const battleState = gameState!.currentBattle!;
    
    // 查找单位
    const unit = battleState.playerUnits.find(u => u.id === unitId);
    if (!unit || unit.skills.length === 0) {
      return res.json({ success: false, message: '单位没有技能' });
    }
    
    // 使用第一个可用技能（简化处理）
    const skill = unit.skills[0];
    
    // 使用vibe执行技能效果
    const skillResult = await v.执行技能效果({
      技能类型: skill.type,
      技能名称: skill.name,
      施法者单位: unit,
      敌人单位列表: battleState.enemyUnits,
      友军单位列表: battleState.playerUnits
    })(z.object({
      description: z.string(),
      damage: z.number().optional(),
      heal: z.number().optional(),
      buffs: z.array(z.string()).optional()
    }));
    
    // 应用技能效果
    const result = skillResult as any;
    if (result.damage && result.damage > 0) {
      // 对所有敌人造成伤害
      battleState.enemyUnits.forEach(enemy => {
        enemy.hp -= result.damage;
      });
      // 移除死亡单位
      battleState.enemyUnits = battleState.enemyUnits.filter(u => u.hp > 0);
    }
    
    if (result.heal && result.heal > 0) {
      // 治疗所有玩家单位
      battleState.playerUnits.forEach(player => {
        player.hp = Math.min(player.hp + result.heal, player.maxHp);
      });
    }
    
    res.json({ success: true, battleState, skillName: skill.name, description: result.description });
  } catch (error) {
    console.error('使用技能失败:', error);
    res.status(500).json({ error: '使用技能失败' });
  }
});

// 等待（结束行动）
app.post('/api/game/battle/wait', async (req, res) => {
  try {
    const { unitId } = req.body;
    const battleState = gameState!.currentBattle!;
    
    // 检查是否所有玩家单位都已行动
    // 简化处理：直接切换到敌人回合
    battleState.currentTurn = 'enemy';
    
    res.json({ success: true, battleState });
  } catch (error) {
    console.error('等待失败:', error);
    res.status(500).json({ error: '等待失败' });
  }
});

// 切换回合
app.post('/api/game/battle/switchTurn', async (req, res) => {
  try {
    const { turn } = req.body;
    const battleState = gameState!.currentBattle!;
    
    battleState.currentTurn = turn;
    
    // 如果切换到玩家回合，重置所有玩家单位的技能冷却
    if (turn === 'player') {
      battleState.playerUnits.forEach(unit => {
        unit.skills.forEach(skill => {
          if (skill.currentCooldown > 0) {
            skill.currentCooldown--;
          }
        });
      });
    }
    
    res.json({ success: true, battleState });
  } catch (error) {
    console.error('切换回合失败:', error);
    res.status(500).json({ error: '切换回合失败' });
  }
});

// 敌人回合
app.post('/api/game/battle/enemyTurn', async (req, res) => {
  try {
    const battleState = gameState!.currentBattle!;
    const logs: string[] = [];
    
    // 对每个敌人执行AI行动
    for (const enemy of battleState.enemyUnits) {
      // 使用vibe决定敌人行动
      const action = await v.决定敌人行动({
        敌人单位: enemy,
        玩家单位列表: battleState.playerUnits,
        战场信息: battleState.battlefield
      })(z.object({
        type: z.enum(['attack', 'move', 'wait']),
        targetId: z.string().optional(),
        targetX: z.number().optional(),
        targetY: z.number().optional(),
        description: z.string()
      }));
      
      const actionResult = action as any;
      
      switch (actionResult.type) {
        case 'attack':
          if (actionResult.targetId) {
            const target = battleState.playerUnits.find(u => u.id === actionResult.targetId);
            if (target) {
              const damage = await v.计算攻击伤害({
                攻击者攻击力: enemy.attack,
                防御者防御力: target.defense,
                攻击者速度: enemy.speed,
                防御者速度: target.speed,
                是否是Boss战: battleState.isBossBattle
              })(z.number());
              
              target.hp -= Math.floor(damage as any);
              logs.push(`【${enemy.name}】攻击 ${target.name}，造成 ${damage} 点伤害`);
              
              // 检查是否死亡
              if (target.hp <= 0) {
                battleState.playerUnits = battleState.playerUnits.filter(u => u.id !== target.id);
                logs.push(`【${target.name}】被击败！`);
              }
            }
          }
          break;
          
        case 'move':
          if (actionResult.targetX !== undefined && actionResult.targetY !== undefined) {
            enemy.x = actionResult.targetX;
            enemy.y = actionResult.targetY;
            logs.push(`【${enemy.name}】移动到 (${actionResult.targetX}, ${actionResult.targetY})`);
          }
          break;
          
        case 'wait':
          logs.push(`【${enemy.name}】等待`);
          break;
      }
    }
    
    // 切换回玩家回合
    battleState.currentTurn = 'player';
    
    res.json({ success: true, battleState, logs });
  } catch (error) {
    console.error('敌人回合执行失败:', error);
    res.status(500).json({ error: '敌人回合执行失败' });
  }
});

// 下一波敌人
app.post('/api/game/battle/nextWave', async (req, res) => {
  try {
    const battleState = gameState!.currentBattle!;
    battleState.currentWave++;
    
    // 使用vibe生成新一波敌人
    const enemyCount = Math.floor(Math.random() * 3) + 2;
    const currentLayer = gameState!.currentLayer;
    const currentLevel = gameState!.currentLevel;
    
    const newEnemies = await Promise.all(
      Array.from({ length: enemyCount }, async (_, i) => {
        const enemy = await v.生成一个普通敌人({
          层数: `game-level-${currentLayer}`,
          敌人名称: `敌人${battleState.currentWave}-${i + 1}`,
          当前关卡: currentLevel
        })(UnitSchema);
        return {
          ...(enemy as any),
          x: 3,
          y: i,
          isPlayer: false
        };
      })
    );
    
    battleState.enemyUnits = newEnemies;
    
    res.json({ success: true, battleState });
  } catch (error) {
    console.error('下一波敌人失败:', error);
    res.status(500).json({ error: '下一波敌人失败' });
  }
});

// 结束战斗
app.post('/api/game/battle/end', async (req, res) => {
  try {
    const { victory } = req.body;
    let rewards = '';
    
    if (victory) {
      // 使用vibe生成战斗奖励
      rewards = await v.生成战斗奖励({
        层数: `game-layer-${gameState!.currentLayer}`,
        关卡: `game-level-${gameState!.currentLevel}`
      })(z.string()) as string;
    }
    
    gameState!.currentBattle = null;
    
    res.json({ 
      success: true, 
      message: victory ? '战斗胜利！你战胜了所有敌人！' : '战斗失败！你的将领们全部倒下了...',
      rewards
    });
  } catch (error) {
    console.error('结束战斗失败:', error);
    res.status(500).json({ error: '结束战斗失败' });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`游戏服务器运行在 http://localhost:${PORT}`);
  console.log('请在浏览器中打开 http://localhost:3000/index.html');
});

export default app;
