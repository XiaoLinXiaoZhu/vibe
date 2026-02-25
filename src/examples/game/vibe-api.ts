/**
 * vibe-api.ts — 将领战棋游戏的 AI 能力层
 * 所有 v 函数调用集中在此，定义 Zod schema 确保类型安全
 */
import { createVibe } from "../../vibe.js";
import { z } from "zod";

const v = createVibe();

// ============================================================
// Schema 定义
// ============================================================

/** 技能 schema */
export const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  damage: z.number(),
  range: z.number(),
  cooldown: z.number(),
  areaOfEffect: z.number().describe("0=单体, 1=十字, 2=九宫格"),
  effect: z.string().describe("附加效果描述，如'降低防御30%持续2回合'，无则为'none'"),
});

/** 将领 schema */
export const GeneralSchema = z.object({
  name: z.string(),
  title: z.string().describe("称号，如'烈焰战神'"),
  description: z.string().describe("一句话背景故事"),
  hp: z.number().describe("生命值 80-150"),
  atk: z.number().describe("攻击力 15-40"),
  def: z.number().describe("防御力 5-20"),
  spd: z.number().describe("速度 3-8，决定行动顺序"),
  moveRange: z.number().describe("移动范围 2-4"),
  skills: z.array(SkillSchema).describe("2-3个技能"),
  emoji: z.string().describe("代表该将领的单个emoji"),
});

/** 敌人 schema */
export const EnemySchema = z.object({
  name: z.string(),
  description: z.string(),
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  spd: z.number(),
  moveRange: z.number(),
  skills: z.array(SkillSchema),
  emoji: z.string(),
  isBoss: z.boolean(),
});

/** 伤害计算结果 schema */
export const DamageResultSchema = z.object({
  damage: z.number().describe("最终伤害值"),
  isCritical: z.boolean(),
  effectApplied: z.string().describe("触发的效果描述，无则为'none'"),
  narrative: z.string().describe("战斗描述文本，富有戏剧性"),
});

/** 敌人 AI 决策 schema */
export const EnemyActionSchema = z.object({
  type: z.enum(["move", "attack", "skill", "wait"]),
  targetX: z.number().describe("目标格子 x 坐标"),
  targetY: z.number().describe("目标格子 y 坐标"),
  skillIndex: z.number().describe("使用技能的索引，不使用技能则为 -1"),
  reasoning: z.string().describe("AI 决策理由，简短"),
});

/** 关卡描述 schema */
export const StageInfoSchema = z.object({
  name: z.string().describe("关卡名称"),
  description: z.string().describe("关卡背景故事，2-3句话"),
  terrain: z.string().describe("地形主题，如'火山熔岩'、'冰雪荒原'"),
  difficulty: z.string().describe("难度描述"),
  specialRule: z.string().describe("特殊规则，如'每回合所有单位受到1点火焰伤害'，无则为'none'"),
  emoji: z.string().describe("代表该关卡的单个emoji"),
});

/** 技能效果计算结果 schema */
export const SkillEffectSchema = z.object({
  damage: z.number(),
  healing: z.number().describe("治疗量，无治疗则为0"),
  buffDescription: z.string().describe("增益效果描述，无则为'none'"),
  debuffDescription: z.string().describe("减益效果描述，无则为'none'"),
  affectedArea: z.array(z.object({ dx: z.number(), dy: z.number() })).describe("相对于目标的影响范围偏移"),
  narrative: z.string().describe("技能释放的戏剧性描述"),
});

/** 战斗总结 schema */
export const BattleSummarySchema = z.object({
  title: z.string().describe("战斗总结标题"),
  narrative: z.string().describe("战斗过程的精彩叙述，3-5句话"),
  mvp: z.string().describe("最有价值将领的名字"),
  mvpReason: z.string().describe("为什么是MVP"),
  rewards: z.string().describe("战斗奖励描述"),
});

// ============================================================
// 类型导出
// ============================================================

export type Skill = z.infer<typeof SkillSchema>;
export type General = z.infer<typeof GeneralSchema>;
export type Enemy = z.infer<typeof EnemySchema>;
export type DamageResult = z.infer<typeof DamageResultSchema>;
export type EnemyAction = z.infer<typeof EnemyActionSchema>;
export type StageInfo = z.infer<typeof StageInfoSchema>;
export type SkillEffect = z.infer<typeof SkillEffectSchema>;
export type BattleSummary = z.infer<typeof BattleSummarySchema>;

// ============================================================
// AI 函数调用
// ============================================================

/**
 * 生成一个将领
 * @param theme 主题风格，如"三国"、"奇幻"、"科幻"
 * @param role 角色定位，如"坦克"、"输出"、"辅助"
 */
export async function generateGeneral(theme: string, role: string): Promise<General> {
  return await v[`生成一个${theme}风格的${role}型将领，属性要平衡合理，技能要有创意且符合角色定位`]()(GeneralSchema);
}

/**
 * 生成关卡敌人
 * @param layer 层数 1-3
 * @param stage 关卡数 1-4
 * @param theme 关卡地形主题
 */
export async function generateEnemies(layer: number, stage: number, theme: string): Promise<Enemy[]> {
  const isBossStage = stage === 4;
  const enemyCount = isBossStage ? 1 : Math.min(2 + layer, 5);
  const difficulty = layer * 1.2 + stage * 0.3;

  return await v[`生成${enemyCount}个敌人用于第${layer}层第${stage}关（${theme}主题），难度系数${difficulty.toFixed(1)}。${isBossStage ? '这是Boss关，生成1个强力Boss' : '生成普通敌人'}。敌人属性应随难度递增`]()(
    z.array(EnemySchema)
  );
}

/**
 * 生成关卡信息
 */
export async function generateStageInfo(layer: number, stage: number): Promise<StageInfo> {
  const isBoss = stage === 4;
  return await v[`生成第${layer}层第${stage}关的关卡信息。${isBoss ? '这是Boss关，要有史诗感' : '普通关卡'}。第1层是新手区域，第2层是进阶区域，第3层是终极挑战`]()(StageInfoSchema);
}

/**
 * 计算攻击伤害
 */
export async function calculateDamage(
  attacker: { name: string; atk: number; skills: Skill[] },
  defender: { name: string; def: number; hp: number },
  skillIndex: number
): Promise<DamageResult> {
  const isSkill = skillIndex >= 0 && skillIndex < attacker.skills.length;
  const skill = isSkill ? attacker.skills[skillIndex] : null;

  return await v[`计算战斗伤害：${attacker.name}(ATK:${attacker.atk})${skill ? `使用技能"${skill.name}"(伤害:${skill.damage})` : '普通攻击'}攻击${defender.name}(DEF:${defender.def},HP:${defender.hp})。考虑暴击(15%概率,1.5倍)、防御减伤、技能效果。生成戏剧性的战斗描述`]()(DamageResultSchema);
}

/**
 * 计算技能效果（AOE等复杂技能）
 */
export async function calculateSkillEffect(
  caster: { name: string; atk: number },
  skill: Skill,
  targets: { name: string; def: number; hp: number }[]
): Promise<SkillEffect> {
  const targetDesc = targets.map(t => `${t.name}(DEF:${t.def},HP:${t.hp})`).join(", ");
  return await v[`计算${caster.name}(ATK:${caster.atk})释放技能"${skill.name}"(${skill.description})对[${targetDesc}]的效果。AOE范围:${skill.areaOfEffect}，附加效果:${skill.effect}`]()(SkillEffectSchema);
}

/**
 * 敌人 AI 决策
 */
export async function decideEnemyAction(
  enemy: { name: string; atk: number; hp: number; maxHp: number; moveRange: number; skills: Skill[]; x: number; y: number },
  allies: { name: string; hp: number; x: number; y: number }[],
  mapWidth: number,
  mapHeight: number
): Promise<EnemyAction> {
  const allyPositions = allies.map(a => `${a.name}(HP:${a.hp})在(${a.x},${a.y})`).join(", ");
  const skillInfo = enemy.skills.map((s, i) => `${i}:${s.name}(范围${s.range},伤害${s.damage})`).join(", ");

  return await v[`敌人AI决策：${enemy.name}(ATK:${enemy.atk},HP:${enemy.hp}/${enemy.maxHp})在(${enemy.x},${enemy.y})，移动范围${enemy.moveRange}，技能[${skillInfo}]。我方将领：[${allyPositions}]。地图${mapWidth}x${mapHeight}。选择最优行动：靠近最弱目标、攻击范围内敌人、或使用技能。坐标必须在地图范围内`]()(EnemyActionSchema);
}

/**
 * 生成战斗总结
 */
export async function generateBattleSummary(
  stageName: string,
  generals: { name: string; remainingHp: number; kills: number }[],
  totalTurns: number,
  victory: boolean
): Promise<BattleSummary> {
  const generalStats = generals.map(g => `${g.name}(剩余HP:${g.remainingHp},击杀:${g.kills})`).join(", ");
  return await v[`生成战斗总结：关卡"${stageName}"，${victory ? '胜利' : '失败'}，共${totalTurns}回合。将领表现：[${generalStats}]。写一段精彩的战斗叙述，选出MVP`]()(BattleSummarySchema);
}
