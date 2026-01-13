# 将领战棋 - Vibe 游戏示例

一个完全由LLM动态生成内容的策略战棋游戏。这个项目展示了vibe库的强大能力，让大语言模型成为游戏内容的"通用层"，而不是使用传统的硬编码游戏框架。

## 游戏特色

- 🎮 **AI生成的将领**：每个将领的名字、描述、属性和技能都由LLM动态生成
- 👹 **AI生成的敌人**：普通敌人和Boss都由LLM创建，拥有独特的能力
- 🧠 **AI战斗系统**：伤害计算、技能效果、敌人AI决策都由LLM实时计算
- 🎯 **随机性**：每次游戏都会遇到不同的将领、敌人和战斗体验
- 🔄 **无限可能**：LLM可以生成无限种不同的游戏内容组合

## 游戏玩法

### 游戏结构
- **3层难度**：每层有4个关卡，第4关是Boss战
- **12个关卡**：总共3层 × 4关卡 = 12个关卡
- **将领系统**：战斗后可选择新将领，最多拥有4个
- **战棋战斗**：4×5格子中的回合制战斗

### 战斗规则
- 玩家和敌人轮流行动
- 可以移动、攻击、使用技能或等待
- 消灭所有敌人进入下一波，完成所有波次获胜
- 所有将领死亡则游戏失败

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

```bash
# Linux/Mac
export LLM_API_KEY=your_api_key_here
export LLM_MODEL=gpt-4  # 可选，默认为 gpt-4
export LLM_BASE_URL=https://api.openai.com/v1  # 可选

# Windows (PowerShell)
$env:LLM_API_KEY="your_api_key_here"
$env:LLM_MODEL="gpt-4"  # 可选
$env:LLM_BASE_URL="https://api.openai.com/v1"  # 可选

# Windows (CMD)
set LLM_API_KEY=your_api_key_here
set LLM_MODEL=gpt-4  # 可选
set LLM_BASE_URL=https://api.openai.com/v1  # 可选
```

### 3. 运行游戏服务器

```bash
# 启动游戏服务器
bun run game-server

# 或
npm run game-server
```

服务器将在 `http://localhost:3000` 启动。

### 4. 打开游戏

在浏览器中访问：
```
http://localhost:3000/index.html
```

## 运行示例

如果想查看vibe API调用的示例而不启动完整游戏：

```bash
bun run game-demo

# 或
npm run game-demo
```

这将演示如何使用vibe生成：
- 将领及其技能
- Boss及其特性
- 攻击伤害计算
- 技能效果执行
- 敌人AI决策

## 技术架构

### 前端 (`game.js`)
- 处理用户交互和UI渲染
- 通过REST API与后端通信
- 实现战棋游戏逻辑

### 后端 (`server.ts`)
- Express服务器提供API接口
- 使用vibe调用LLM生成游戏内容
- 实现游戏状态管理和战斗逻辑

### Vibe集成

游戏通过vibe动态调用以下LLM功能：

```typescript
// 生成将领
await v.生成一个游戏将领('攻击型', '战士', '火焰')(GeneralSchema);

// 生成Boss
await v.生成一个layer1的boss怪物('古代神话风格', '火焰主题')(BossSchema);

// 计算伤害
await v.计算攻击伤害(攻击力, 防御力, 攻击速度, 防御速度, 是否Boss)(DamageSchema);

// 执行技能
await v.执行技能效果(技能类型, 技能名, 施法者, 敌人列表, 友军列表)(SkillEffectSchema);

// 敌人AI决策
await v.决定敌人行动(敌人, 玩家列表, 战场信息)(ActionSchema);
```

## 项目结构

```
src/examples/game/
├── types.ts          # 游戏类型定义
├── index.html        # 前端HTML界面
├── style.css         # 前端样式
├── game.js           # 前端游戏逻辑
├── server.ts         # 后端服务器
├── game-entry.ts     # 游戏入口和示例
└── README.md         # 说明文档
```

## 游戏截图（概念）

### 主菜单
- 显示当前层数和关卡
- 显示本层Boss预告
- 选择将领、查看将领、开始战斗

### 将领选择
- 每次刷新3个可选将领
- 显示将领属性、技能、稀有度
- 三选一获得新将领

### 战斗界面
- 4×5的战棋格子
- 显示玩家单位和敌人单位
- 回合制战斗：移动、攻击、技能、等待
- 实时战斗日志

## 核心概念：LLM作为游戏内容的"通用层"

传统游戏开发方式：
```
游戏引擎 → 硬编码的游戏规则 → 固定的游戏内容
```

使用vibe的方式：
```
vibe → LLM → 动态生成的游戏内容 → 无限的游戏可能性
```

这种方式的优势：
- ✅ **无限的内容多样性**：每次游戏都不同
- ✅ **快速原型开发**：无需编写复杂的内容系统
- ✅ **智能化游戏体验**：AI可以理解上下文，生成合理的内容
- ✅ **易于扩展**：添加新内容只需调用新的vibe函数

## 注意事项

⚠️ **重要提示**：
- 这是一个演示项目，展示了vibe库的能力
- 每次函数调用都会消耗LLM API额度，请注意成本
- LLM生成的内容可能不一致，这是正常的
- 建议使用较新的模型（如GPT-4）以获得更好的体验
- 首次启动可能需要等待API响应时间
- 确保已正确设置环境变量 `LLM_API_KEY`、`LLM_MODEL`（可选）和 `LLM_BASE_URL`（可选）

## 开发和扩展

### 添加新的将领类型

在 `server.ts` 中修改将领生成调用：

```typescript
const generals = await Promise.all([
  v.生成一个游戏将领('攻击型', '战士', '火焰')(GeneralSchema),
  v.生成一个游戏将领('防御型', '坦克', '岩石')(GeneralSchema),
  v.生成一个游戏将领('治疗型', '牧师', '神圣')(GeneralSchema),
  v.生成一个游戏将领('控制型', '术士', '暗影')(GeneralSchema),
]);
```

### 添加新的战斗机制

在 `server.ts` 中添加新的vibe函数调用：

```typescript
// 暴击系统
const isCrit = await v.判断是否暴击(暴击率, 攻击者速度)(z.boolean());

// 回避系统
const isDodge = await v.判断是否回避(回避率, 防御者速度)(z.boolean());

// 连击系统
const comboCount = await v.计算连击数(连续命中次数, 连击概率)(z.number());
```

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！

## 致谢

- [vibe](https://github.com/yourusername/vibe) - 核心库
- [OpenAI](https://openai.com/) - 提供LLM API
- [Express](https://expressjs.com/) - Web服务器框架
