# ⚔️ 将领战棋 — Vibe Game Demo

一个完全由 LLM 动态生成内容的回合制策略战棋游戏，展示 vibe 库的 `v` 函数能力。

## 🎮 游戏特色

- 🤖 **AI 生成将领**：名字、描述、属性、技能全部由 `v` 函数动态生成
- 👹 **AI 生成敌人**：普通敌人和 Boss 由 LLM 创建，拥有独特能力
- 🧠 **AI 战斗系统**：伤害计算、技能效果、战斗叙事由 LLM 实时生成
- 🤖 **AI 敌人决策**：敌人的移动和攻击策略由 LLM 决定
- 📜 **AI 关卡描述**：每关的名称、背景故事、特殊规则由 LLM 生成
- 🏆 **AI 战斗总结**：每场战斗结束后生成精彩叙述和 MVP 评选

## 🚀 快速开始

```bash
# 1. 设置环境变量
export LLM_API_KEY=your_api_key
export LLM_BASE_URL=https://api.openai.com/v1  # 可选
export LLM_MODEL=gpt-4  # 可选

# 2. 启动游戏
bun run game

# 3. 浏览器打开
open http://localhost:3000
```

## 🎯 玩法说明

### 招募阶段
1. 选择主题（奇幻/三国/科幻/神话）和角色定位（战士/法师/坦克/刺客/辅助）
2. 点击「召唤」招募将领（最多3个）
3. 点击「出征」开始游戏

### 战斗阶段
- **选择单位**：点击己方将领（蓝色血条）
- **移动**：点击绿色高亮格子移动
- **普通攻击**：点击相邻敌人（红色血条）
- **技能**：在侧面板点击技能按钮，再点击敌人释放
- **结束回合**：点击「结束回合」，敌人 AI 行动

### 关卡结构
- 3 层 × 4 关 = 12 关
- 每层第 4 关为 Boss 关
- 通关所有关卡即为胜利

## 📁 文件结构

```
game/
├── server.ts       # Express 服务器 + REST API
├── game-engine.ts  # 游戏状态管理 + 战斗逻辑
├── vibe-api.ts     # v 函数调用封装 + Zod schema
├── public/
│   └── index.html  # 前端页面（HTML/CSS/JS）
└── README.md
```

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/state` | 获取当前游戏状态 |
| POST | `/api/recruit` | 招募将领 `{theme, role}` |
| POST | `/api/start` | 完成招募，开始游戏 |
| POST | `/api/select` | 选中单位 `{unitId}` |
| POST | `/api/deselect` | 取消选中 |
| POST | `/api/move` | 移动单位 `{unitId, x, y}` |
| POST | `/api/attack` | 普通攻击 `{attackerId, targetId}` |
| POST | `/api/skill` | 使用技能 `{unitId, skillIndex, targetId}` |
| POST | `/api/end-turn` | 结束玩家回合 |
| POST | `/api/reset` | 重置游戏 |

## 🔮 v 函数调用示例

```typescript
// 生成将领
const general = await v[`生成一个奇幻风格的战士型将领...`]()(GeneralSchema);

// 计算伤害（AI 考虑暴击、防御减伤、技能效果）
const result = await v[`计算战斗伤害：...`]()(DamageResultSchema);

// 敌人 AI 决策
const action = await v[`敌人AI决策：...`]()(EnemyActionSchema);
```
