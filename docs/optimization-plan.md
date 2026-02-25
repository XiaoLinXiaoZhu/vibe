# Vibe 优化计划

## 项目现状分析

### 当前架构

Vibe 的核心流程：`v.xxx(args)` → Proxy 拦截 → LLM 生成 JS 代码 → `new AsyncFunction` 执行 → 返回结果。

核心文件：
- [`src/llm.ts`](../src/llm.ts) — LLM 调用和 prompt 定义
- [`src/vibe.ts`](../src/vibe.ts) — 主类，`handleCall()` 和 `executeCode()`
- [`src/builder.ts`](../src/builder.ts) — 链式调用构建器

### 发现的问题

**1. Prompt 过于固化（预编码决策树）**

当前 `llm.ts` 的 system prompt 把任务分成 PATH A/B/C 三条硬编码路径：
- PATH A: 纯逻辑 / 原生 JS
- PATH B: 直接知识（无参数时）
- PATH C: 动态委托（递归调用 v）

user prompt 中的 DECISION GUIDE 进一步硬编码了判断逻辑（"Is it a specific command? → YES: Use PATH C"）。这本质上是在 prompt 里写了一棵 if-else 决策树，限制了模型的灵活性，甚至可能误导它。

**2. 递归调用的结构性问题**

知识型任务（讲笑话、解释概念）被迫通过 `await v[prompt]()(z.string())` 递归调用 LLM，导致：
- 每次递归都是全新的 LLM 调用，前一步的推理上下文完全丢失
- `maxDepth=5` 是人为的经济断路器，不是技术必需
- Token 浪费：每次递归都重新发送完整的 system prompt

根本原因：所有任务都走"生成代码→执行"的单一管道，知识型任务明明可以直接 `return "答案"`，却被 prompt 引导去递归调用 v。

**3. 无法与外部世界交互**

`executeCode()` 的沙箱中只有 `args`、`v`、`z` 三个全局对象，没有 `fetch`、`shell` 等能力。需要外部信息的任务（网页浏览、系统命令）完全无法处理。

**4. 无错误恢复机制**

LLM 生成的代码执行失败时直接抛错。但错误信息是极高质量的 prompt（"TypeError: Cannot read property 'x' of undefined at line 3"），可以让 LLM 修正代码。

**5. 缺少量化评估体系**

现有测试只验证"能跑通"，没有评估输出质量。无法量化 prompt 改进的效果。

---

## 设计约束（从讨论中确认）

1. **保持代码生成范式** — LLM 生成 JS 代码 → 执行，这是 vibe 的核心身份，不改
2. **保持调用方式不变** — `v.xxx()`、`v.xxx()(schema)`、`v.xxx().withSchema()` 全部不变
3. **不引入 Agent/框架级控制流** — 不做 Trampoline runner、不做 ReAct 循环。复杂编排通过 prompt 引导模型在生成的代码中自行处理
4. **shell 能力直接注入** — 用户自行承担安全风险（娱乐项目）
5. **maxDepth 保留但弱化** — 好的 prompt 让模型减少不必要递归，maxDepth 作为安全网而非常态

---

## 优化方案

### G1: 能力增强

#### O1.1: 扩展运行时能力（shell + fetch）

**目标**：让 LLM 生成的代码能与外部世界交互。

**方案 A1.1.1**：在 `executeCode()` 中注入 `shell` 和 `fetch`

- `shell`：`child_process.exec` 的 Promise 封装，LLM 代码中可 `await shell("curl ...")`
- `fetch`：全局 fetch（Bun/Node 18+ 原生支持）或 node-fetch
- 注入方式与 `v`/`z`/`args` 一致，作为 `AsyncFunction` 的参数传入
- prompt 中描述这些工具的存在和用法

**改动范围**：
- `src/vibe.ts` — `executeCode()` 方法，增加 `shell`/`fetch` 参数
- `src/llm.ts` — system prompt 中增加工具描述

**验证标准**：`v.getWeather("北京")` 能通过 shell/fetch 获取真实天气信息并返回。

---

#### O1.2: 错误重试机制

**目标**：代码执行失败时自动修正，提升可靠性。

**方案 A1.2.1**：在 `handleCall()` 中加入重试循环

- 捕获执行异常或 schema 验证失败
- 将原始代码 + 错误信息 + 原始 prompt 发给 LLM 重新生成
- 硬上限 2 次重试（最多 3 次 LLM 调用）
- 超过重试次数仍失败则抛出原始错误

**这不是 Agent 循环**：
| | 错误重试 | Agent 循环 |
|---|---------|-----------|
| 循环条件 | 代码执行失败 | 任务未完成 |
| 循环次数 | 硬上限 2 次 | 不确定 |
| 决策者 | 框架代码（检测到异常就重试） | LLM（自己决定是否继续） |

**改动范围**：
- `src/vibe.ts` — `handleCall()` 方法，包裹 try-catch 重试循环
- `src/llm.ts` — 新增 `regenerateCode()` 方法（接收错误信息作为额外上下文）

**验证标准**：故意触发一个 LLM 容易犯的错误（如返回类型不匹配 schema），验证重试后能自动修正。

---

#### O1.3: 组建 benchmark 体系

**目标**：量化评估 vibe 在不同任务类型上的表现，为持续迭代提供基线。

**方案 A1.3.1**：5 维度 × 5-10 用例 + LLM-as-judge 打分

**维度设计**：

| 维度 | 评估重点 | 示例用例 |
|------|---------|---------|
| 数学计算 | 正确性 | `v.add(123, 456)` → 579, `v.fibonacci(10)` → 55 |
| 算法逻辑 | 正确性 + 代码质量 | `v.sort([3,1,4,1,5])`, `v.binarySearch([1,2,3,4,5], 3)` |
| 趣味问题 | 创意 + 相关性 | `v.讲个笑话()`, `v.将emoji转化为字符画("🐱", 10, 10)` |
| 角色扮演 | 一致性 + 沉浸感 | `v["作为猫娘回复"]("你好")`, `v["用莎士比亚风格描述"](topic)` |
| 信息获取 | 准确性 + 完整性 | `v.getWeather("北京")`, `v.summarize("https://...")` |

**评分机制**：
- 每个用例执行 vibe 调用，获取结果
- 用另一个 LLM 调用按预定义的 rubric 打分（1-10）
- 数学/算法类可以同时用确定性断言验证（正确答案已知）
- 输出汇总报告：每个维度的平均分、总分、失败用例列表

**改动范围**：
- 新增 `src/benchmark/` 目录
- `src/benchmark/cases/` — 各维度的测试用例定义
- `src/benchmark/judge.ts` — LLM 打分逻辑
- `src/benchmark/runner.ts` — 执行和汇总
- `package.json` — 新增 `benchmark` script

**验证标准**：`bun run benchmark` 能跑完所有用例并输出可读的评分报告。

---

### G2: Prompt 重写

#### O2.1 + O2.2: 基于"思维分子结构"理论重写 prompt 体系

**目标**：从"预编码决策树"转向"推理引导"，教模型善用 JS 能力，减少不必要的 v 递归。

**理论基础**：参考 [`docs/CoT与FewShot设计指南.md`](CoT与FewShot设计指南.md) 和 [`docs/SPIRIT-v5-重度推理实验记录.md`](SPIRIT-v5-重度推理实验记录.md)。

当前 prompt 的问题不只是"决策树太死板"，而是**设计模式本身就是错的**——它是声明式的 if-else 规则（"如果是 X 类型任务就走 PATH A"），这种模式：
- 缺乏 LLM 需要的元认知振荡结构
- 直接声明规则而非让模型通过推理理解"为什么"
- 硬编码路径选择，限制了模型的灵活性

**方案 A2.1.3**：基于 Facts→Reasoning→Conclusions 模式重写 prompt

**设计原则**（来自思维分子结构理论）：

1. **结构优先于内容**
   - 不堆砌"思考关键词"（如 "think step by step"），而是让 prompt 本身体现元认知振荡
   - prompt 中的推理示范应包含 Deep Reasoning（逻辑推进）、Self-Reflection（回溯验证）、Self-Exploration（探索替代方案）的自然交替
   - 行为分布目标：Deep ~40-50%, Reflect ~15-25%, Explore ~10-20%, Normal ~15-25%

2. **从微妙事实推导行为（Facts → Reasoning → Conclusions）**
   - 不直接声明"你应该优先用 JS 原生能力"
   - 而是给出事实（"你的运行时环境有 args/v/z/shell/fetch，每次调用 v 都会触发一次新的 LLM 调用"）
   - 通过推理链让模型自然理解：能用 JS 解决的就不该调用 v（因为 v 调用有成本）

3. **避免结构冲突**
   - prompt 风格统一，不混合声明式规则和推理式引导
   - 所有行为指导都从事实推导得出，而非直接声明

4. **区分"可推导"和"外部约束"**
   - 运行时环境描述（args/v/z/shell/fetch 的存在和用法）= 外部约束，直接陈述
   - 策略选择（何时用 JS、何时用 v、何时直接返回）= 可推导，通过推理链引导

**具体 prompt 结构设计**：

```
System Prompt 结构：

# FACTS（运行时环境事实）
F1: 你生成的是 JS 函数体代码，会被 new AsyncFunction 执行
F2: 运行时可用对象：args（参数数组）、v（vibe 实例）、z（zod）、shell()、fetch()
F3: 调用 v[name](...args) 会触发一次新的 LLM 调用（有成本和延迟）
F4: 函数名和参数共同定义了任务意图
F5: 你可以在代码中定义辅助函数、使用任何 JS 原生能力

# REASONING（推理链，体现元认知振荡）
[Deep] F3 说每次 v 调用都有成本 → 如果任务能用纯 JS 解决，调用 v 是浪费
[Reflect] 但有些任务的答案在 AI 知识里（讲笑话、解释概念），纯 JS 无法解决
[Explore] 那这类任务怎么办？直接 return 内容即可——代码本身就是 LLM 生成的，
         LLM 的知识已经在生成过程中被使用了
[Deep] 所以策略自然分为：
       - 答案在算法里 → 写 JS 代码
       - 答案在 AI 知识里 → 直接 return 内容
       - 答案在外部世界 → 用 shell/fetch 获取
[Reflect] 那什么时候该用 v？只有当子任务本身需要独立的 AI 推理时
         （例如：主任务是"分析文章情感"，子任务是"翻译这段日文"）

# CONSTRAINT（外部约束，直接陈述）
- 只返回函数体代码，不要 function 声明或 markdown 包裹
- 通过 args[0], args[1] 访问参数
- 如果提供了期望返回类型，确保返回值匹配
```

```
User Prompt 结构（精简）：

实现: "{functionName}"
参数: {argsInfo}
期望返回类型: {schemaDesc}
```

**与当前 prompt 的对比**：

| 维度 | 当前 prompt | 新 prompt |
|------|-----------|----------|
| 模式 | 声明式决策树（PATH A/B/C） | Facts→Reasoning→Conclusions |
| 路径选择 | 硬编码 DECISION GUIDE | 模型从事实推理得出 |
| v 递归引导 | "⚠️ ALWAYS append (z.schema) when calling v!" | 从 F3（v 调用有成本）自然推导出"能不用就不用" |
| 知识型任务 | PATH B（但条件太窄："Only if NO args"） | 推理链自然覆盖（答案在 AI 知识里 → 直接 return） |
| 元认知振荡 | 无 | 推理链中包含 Deep/Reflect/Explore 交替 |
| user prompt | 冗长的 DECISION GUIDE + specificInstruction | 精简为任务描述 + 参数 + 返回类型 |

**改动范围**：
- `src/llm.ts` — `generateFunctionCode()` 中的 systemPrompt 和 userPrompt 完全重写

**验证标准**：通过 benchmark 对比重写前后的分数变化。特别关注：
- 数学/算法类分数不应下降（纯逻辑能力）
- 趣味/角色扮演类分数应提升（减少不必要递归，直接输出内容）
- v 递归调用次数应显著减少（可通过日志统计）
- prompt 本身的行为分布应接近 Deep ~45%, Reflect ~20%, Explore ~15%, Normal ~20%

---

## 实施顺序

| 顺序 | 内容 | 理由 |
|------|------|------|
| **1** | G2 prompt 重写 | 核心改进，影响所有后续测试的基线 |
| **2** | O1.1 注入 shell/fetch | 扩展能力边界，为 benchmark "信息获取"维度做准备 |
| **3** | O1.2 错误重试 | 提升可靠性，实现成本极低 |
| **4** | O1.3 benchmark | 最后做，量化验证 1-3 的效果 |

Prompt 重写放第一是因为它是 benchmark 的基线——先有好的 prompt，benchmark 的分数才有意义。

---

## 废弃方案记录

以下方案在讨论中被探索后废弃，记录原因以备参考：

### ❌ 任务分类路由（A2.1.1）
在 `handleCall` 中引入 LLM 分类步骤，按 compute/knowledge/tool 路由到不同执行路径。
**废弃原因**：引入了框架层面的控制流，与"保持代码生成范式"的约束冲突。

### ❌ Trampoline Runner 架构（A2.1.2）
LLM 返回 Step JSON（done/call/continue），框架用 while 循环编排执行。
**废弃原因**：改变了 LLM 的输出协议（从 JS 代码变为 JSON），过度设计。用户希望保持"LLM 生成代码"的核心身份。

### ❌ Trampoline 协议 prompt（A2.2.1）
基于 Step 协议重写 prompt。
**废弃原因**：依赖已废弃的 Trampoline 架构。
