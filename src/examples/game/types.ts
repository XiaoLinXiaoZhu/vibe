// 游戏类型定义

export interface GameState {
  currentLayer: number;           // 当前层数 (1-3)
  currentLevel: number;            // 当前关卡 (1-4)
  bosses: string[];                // 每层的boss风格预告
  generals: General[];            // 玩家拥有的将领 (最多4个)
  selectedGenerals: General[];    // 当前选中的将领 (3个用于战斗)
  availableGenerals: General[];    // 可供购买的将领
  currentBattle: BattleState | null;
}

export interface General {
  id: string;
  name: string;
  description: string;
  skills: Skill[];
  stats: GeneralStats;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Skill {
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'support' | 'special';
  cooldown: number;
  currentCooldown: number;
}

export interface GeneralStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattleState {
  battlefield: BattleGrid;
  playerUnits: Unit[];
  enemyUnits: Unit[];
  currentWave: number;
  totalWaves: number;
  currentTurn: 'player' | 'enemy';
  selectedUnit: Unit | null;
  isBossBattle: boolean;
  boss?: BossInfo;
}

export interface BattleGrid {
  width: number;  // 4
  height: number; // 5
}

export interface Unit {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: Skill[];
  isPlayer: boolean;
}

export interface BossInfo {
  name: string;
  description: string;
  buffs: BossBuff[];
}

export interface BossBuff {
  name: string;
  description: string;
  effect: string;
}

// Schema 定义供vibe使用
export const GeneralSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['attack', 'defense', 'support', 'special'] },
          cooldown: { type: 'number' },
          currentCooldown: { type: 'number' }
        }
      }
    },
    stats: {
      type: 'object',
      properties: {
        hp: { type: 'number' },
        attack: { type: 'number' },
        defense: { type: 'number' },
        speed: { type: 'number' }
      }
    },
    rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] }
  }
};

export const BossSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    buffs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          effect: { type: 'string' }
        }
      }
    }
  }
};

export const EnemyWaveSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      x: { type: 'number' },
      y: { type: 'number' },
      hp: { type: 'number' },
      attack: { type: 'number' },
      defense: { type: 'number' }
    }
  }
};
