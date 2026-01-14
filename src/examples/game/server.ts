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

// BattleState Update Schema (Partial<BattleState>)
const BattleStateUpdateSchema = z.object({
  battlefield: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
  playerUnits: z.array(z.object({
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
  })).optional(),
  enemyUnits: z.array(z.object({
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
  })).optional(),
  currentWave: z.number().optional(),
  totalWaves: z.number().optional(),
  currentTurn: z.enum(['player', 'enemy']).optional(),
  selectedUnit: z.object({
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
  }).nullable().optional(),
  isBossBattle: z.boolean().optional(),
  boss: z.object({
    name: z.string(),
    description: z.string(),
    buffs: z.array(z.object({
      name: z.string(),
      description: z.string(),
      effect: z.string()
    }))
  }).optional()
});

// BattleState Schema for input
const BattleStateInputSchema = z.object({
  battlefield: z.object({
    width: z.number(),
    height: z.number()
  }),
  playerUnits: z.array(z.object({
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
  })),
  enemyUnits: z.array(z.object({
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
  })),
  currentWave: z.number(),
  totalWaves: z.number(),
  currentTurn: z.enum(['player', 'enemy']),
  selectedUnit: z.object({
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
  }).nullable(),
  isBossBattle: z.boolean(),
  boss: z.object({
    name: z.string(),
    description: z.string(),
    buffs: z.array(z.object({
      name: z.string(),
      description: z.string(),
      effect: z.string()
    }))
  }).optional()
});

// GameState Schema for input
const GameStateInputSchema = z.object({
  currentLayer: z.number(),
  currentLevel: z.number(),
  bosses: z.array(z.string()),
  generals: z.array(z.any()),
  selectedGenerals: z.array(z.any()),
  availableGenerals: z.array(z.any()),
  currentBattle: BattleStateInputSchema.nullable()
});

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

    // 初始化游戏状态
    gameState = {
      currentLayer: 1,
      currentLevel: 1,
      bosses: [],
      generals: [],
      selectedGenerals: [],
      availableGenerals: [],
      currentBattle: null
    };

    debugLog('游戏状态初始化完成', {
      currentLayer: gameState.currentLayer,
      currentLevel: gameState.currentLevel
    });

    // 使用vibe生成每层的boss风格 - 传入完整gameState对象
    debugLog('生成Boss风格...');
    const bosses = await Promise.all([
      v.生成一个boss风格描述(gameState)(z.object({
        层数: z.string(),
        风格描述: z.string(),
        主题: z.string()
      })),
      v.生成一个boss风格描述(gameState)(z.object({
        层数: z.string(),
        风格描述: z.string(),
        主题: z.string()
      })),
      v.生成一个boss风格描述(gameState)(z.object({
        层数: z.string(),
        风格描述: z.string(),
        主题: z.string()
      }))
    ]);

    debugLog('Boss风格生成完成', { bosses });

    gameState.bosses = bosses as any;

    res.json(gameState);
  } catch (error) {
    debugError('启动游戏失败', error);
    res.status(500).json({ error: '启动游戏失败' });
  }
});

// 获取可选将领
app.get('/api/game/generals/available', async (req, res) => {
  try {
    // 使用vibe生成3个可选将领 - 传入完整gameState对象
    const generals = await Promise.all([
      v.生成一个游戏将领的信息(gameState)(GeneralSchema),
      v.生成一个游戏将领的信息(gameState)(GeneralSchema),
      v.生成一个游戏将领的信息(gameState)(GeneralSchema)
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

    debugLog('开始战斗', {
      generalsCount: generals.length,
      currentLayer,
      currentLevel
    });

    // 判断是否是boss战
    const isBossBattle = currentLevel === 4;
    debugLog(`战斗类型: ${isBossBattle ? 'BOSS战' : '普通战斗'}`);

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

    debugLog('玩家单位创建完成', {
      playerUnits: playerUnits.map((u: Unit) => ({
        name: u.name,
        hp: u.hp,
        attack: u.attack,
        defense: u.defense
      }))
    });

    // 使用vibe生成敌人
    const enemyCount = isBossBattle ? 1 : Math.floor(Math.random() * 3) + 2;
    debugLog('生成敌人', { enemyCount, isBossBattle });
    let enemyUnits: Unit[];

    // 创建临时battleState用于生成敌人
    const tempBattleState: BattleState = {
      battlefield: { width: 4, height: 5 },
      playerUnits: playerUnits,
      enemyUnits: [],
      currentWave: 1,
      totalWaves: 3,
      currentTurn: 'player',
      selectedUnit: null,
      isBossBattle,
      boss: isBossBattle ? {
        name: 'boss',
        description: '强大的boss',
        buffs: []
      } : undefined
    };

    if (isBossBattle) {
      // Boss战 - 使用vibe生成boss - 传入完整battleState对象
      debugLog('生成Boss...', {
        layer: currentLayer,
        bossStyle: gameState!.bosses[currentLayer - 1]
      });
      const boss = await v.生成一个boss怪物(tempBattleState)(BossSchema);

      debugLog('Boss生成完成', boss);

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
      // 普通战斗 - 使用vibe生成敌人 - 传入完整battleState对象
      debugLog('生成普通敌人...');
      enemyUnits = await Promise.all(
        Array.from({ length: enemyCount }, async (_, i) => {
          const enemy = await v.生成一个普通敌人(tempBattleState)(UnitSchema);
          return {
            ...(enemy as any),
            x: 3,
            y: i,
            isPlayer: false
          };
        })
      );

      debugLog('普通敌人生成完成', {
        enemyUnits: enemyUnits.map(u => ({
          name: u.name,
          hp: u.hp,
          attack: u.attack
        }))
      });
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
    debugLog('战斗状态创建完成', {
      playerUnitsCount: playerUnits.length,
      enemyUnitsCount: enemyUnits.length,
      currentTurn: battleState.currentTurn
    });

    res.json(battleState);
  } catch (error) {
    debugError('开始战斗失败', error);
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

    debugLog('执行攻击', { attackerId, targetId });

    // 查找攻击者和目标
    const attacker = battleState.playerUnits.find(u => u.id === attackerId);
    const target = battleState.enemyUnits.find(u => u.id === targetId);

    if (!attacker || !target) {
      debugLog('攻击失败：单位不存在', { attackerId, targetId });
      return res.json({ success: false, message: '单位不存在' });
    }

    debugLog('攻击详情', {
      attacker: attacker.name,
      target: target.name,
      attackerPos: { x: attacker.x, y: attacker.y },
      targetPos: { x: target.x, y: target.y }
    });

    // 计算伤害
    const distance = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    const attackRange = 1; // 默认攻击距离

    if (distance > attackRange) {
      debugLog('攻击失败：距离不足', { distance, attackRange });
      return res.json({ success: false, message: '攻击距离不足' });
    }

    // 使用vibe计算伤害 - 传入包含attacker和target的完整对象，返回Partial<BattleState>
    const battleStateUpdate = await v.计算攻击伤害({
      battleState: battleState,
      attacker: attacker,
      target: target
    })(BattleStateUpdateSchema);

    const update = battleStateUpdate as z.infer<typeof BattleStateUpdateSchema>;

    debugLog('伤害计算完成', {
      attackerAttack: attacker.attack,
      targetDefense: target.defense,
      battleStateUpdate: update
    });

    // 应用返回的battleState更新
    if (update.enemyUnits) {
      battleState.enemyUnits = update.enemyUnits as Unit[];
    }
    if (update.currentTurn !== undefined) {
      battleState.currentTurn = update.currentTurn;
    }

    // 切换到敌人回合
    battleState.currentTurn = 'enemy';

    res.json({ success: true, battleState });
  } catch (error) {
    debugError('攻击失败', error);
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
    
    // 使用vibe执行技能效果 - 传入battleState，返回Partial<BattleState>
    const battleStateUpdate = await v.执行技能效果({
      battleState: battleState,
      技能类型: skill.type,
      技能名称: skill.name,
      施法者单位: unit
    })(BattleStateUpdateSchema);

    const update = battleStateUpdate as z.infer<typeof BattleStateUpdateSchema>;

    // 应用返回的battleState更新
    if (update.enemyUnits) {
      battleState.enemyUnits = update.enemyUnits as Unit[];
    }
    if (update.playerUnits) {
      battleState.playerUnits = update.playerUnits as Unit[];
    }
    if (update.currentTurn !== undefined) {
      battleState.currentTurn = update.currentTurn;
    }

    // 切换到敌人回合
    battleState.currentTurn = 'enemy';

    res.json({ success: true, battleState, skillName: skill.name });
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

    debugLog('开始敌人回合', {
      enemyCount: battleState.enemyUnits.length,
      playerCount: battleState.playerUnits.length
    });

    // 对每个敌人执行AI行动
    for (const enemy of battleState.enemyUnits) {
      debugLog(`敌人 ${enemy.name} 行动中...`, {
        pos: { x: enemy.x, y: enemy.y }
      });

      // 使用vibe决定敌人行动 - 传入battleState，返回Partial<BattleState>
      const battleStateUpdate = await v.决定敌人行动({
        battleState: battleState,
        敌人单位: enemy
      })(BattleStateUpdateSchema);

      const actionResult = battleStateUpdate as any;
      debugLog(`敌人 ${enemy.name} 行动更新`, actionResult);

      // 应用返回的battleState更新
      if (actionResult.playerUnits) {
        battleState.playerUnits = actionResult.playerUnits;
      }
      if (actionResult.enemyUnits) {
        battleState.enemyUnits = actionResult.enemyUnits;
      }

      switch (actionResult.type) {
        case 'attack':
          // 使用vibe计算敌人攻击伤害 - 传入battleState和相关信息，返回Partial<BattleState>
          const attackUpdate = await v.计算攻击伤害({
            battleState: battleState,
            attacker: enemy,
            target: battleState.playerUnits[0] || null
          })(BattleStateUpdateSchema);

          const update = attackUpdate as z.infer<typeof BattleStateUpdateSchema>;

          // 应用返回的battleState更新
          if (update.playerUnits) {
            battleState.playerUnits = update.playerUnits as Unit[];
          }
          if (update.enemyUnits) {
            battleState.enemyUnits = update.enemyUnits as Unit[];
          }

          logs.push(`【${enemy.name}】攻击完成`);
          break;

        case 'move':
          if (actionResult.targetX !== undefined && actionResult.targetY !== undefined) {
            const oldPos = { x: enemy.x, y: enemy.y };
            enemy.x = actionResult.targetX;
            enemy.y = actionResult.targetY;
            debugLog(`【${enemy.name}】移动`, { from: oldPos, to: { x: enemy.x, y: enemy.y } });
            logs.push(`【${enemy.name}】移动到 (${actionResult.targetX}, ${actionResult.targetY})`);
          }
          break;

        case 'wait':
          debugLog(`【${enemy.name}】等待`);
          logs.push(`【${enemy.name}】等待`);
          break;
      }
    }

    // 切换回玩家回合
    battleState.currentTurn = 'player';
    debugLog('敌人回合结束，切换到玩家回合', {
      remainingEnemies: battleState.enemyUnits.length,
      remainingPlayers: battleState.playerUnits.length
    });

    res.json({ success: true, battleState, logs });
  } catch (error) {
    debugError('敌人回合执行失败', error);
    res.status(500).json({ error: '敌人回合执行失败' });
  }
});

// 下一波敌人
app.post('/api/game/battle/nextWave', async (req, res) => {
  try {
    const battleState = gameState!.currentBattle!;
    battleState.currentWave++;

    // 使用vibe生成新一波敌人 - 传入完整battleState对象
    const enemyCount = Math.floor(Math.random() * 3) + 2;
    const newEnemies = await Promise.all(
      Array.from({ length: enemyCount }, async (_, i) => {
        const enemy = await v.生成一个普通敌人(battleState)(UnitSchema);
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
      // 使用vibe生成战斗奖励 - 传入完整gameState对象
      const rewardResult = await v.生成战斗奖励(gameState)(z.object({
        奖励描述: z.string()
      }));
      rewards = (rewardResult as any).奖励描述;
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
  console.log(`╔═════════════════════════════════════════════╗`);
  console.log(`║     游戏服务器已启动                           ║`);
  console.log(`╠═════════════════════════════════════════════╣`);
  console.log(`║  端口: ${PORT.toString().padEnd(35)}║`);
  console.log(`║  URL:  http://localhost:${PORT}${' '.repeat(23 - PORT.toString().length)}║`);
  console.log(`║  Debug: ${DEBUG ? '开启' : '关闭'}${' '.repeat(33)}║`);
  console.log(`╠═════════════════════════════════════════════╣`);
  console.log(`║  API端点:                                    ║`);
  console.log(`║    - GET  /api/debug/state                   ║`);
  console.log(`║    - POST /api/debug/reset                   ║`);
  console.log(`║    - POST /api/debug/setLevel                ║`);
  console.log(`║    - GET  /api/debug/allStates               ║`);
  console.log(`║    - POST /api/game/start                    ║`);
  console.log(`║    - GET  /api/game/generals/available       ║`);
  console.log(`║    - POST /api/game/battle/start             ║`);
  console.log(`╚═════════════════════════════════════════════╝`);
  console.log('');
  console.log(`📝 请在浏览器中打开 http://localhost:${PORT}/index.html`);
  console.log('');
});

export default app;
