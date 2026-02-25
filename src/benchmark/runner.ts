import { createVibe } from '../vibe.js';
import { cases, type BenchmarkCase } from './cases.js';
import OpenAI from 'openai';

const v = createVibe();

// LLM judge 用同一个配置
const judgeClient = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
});
const judgeModel = process.env.LLM_MODEL ?? 'gpt-4';

interface CaseResult {
  case: BenchmarkCase;
  result?: unknown;
  error?: string;
  score: number;       // 1-10
  scoreReason: string;
  timeMs: number;
}

/**
 * 用 LLM 打分
 */
async function judgeWithLLM(
  caseDef: BenchmarkCase,
  result: unknown
): Promise<{ score: number; reason: string }> {
  const response = await judgeClient.chat.completions.create({
    model: judgeModel,
    messages: [
      {
        role: 'system',
        content: `You are a benchmark judge. Score the result from 1-10 based on the rubric. Reply in JSON: {"score": <number>, "reason": "<brief explanation>"}`,
      },
      {
        role: 'user',
        content: `Task: "${caseDef.functionName}"(${JSON.stringify(caseDef.args).slice(1, -1)})
Result: ${JSON.stringify(result)}

Rubric: ${caseDef.rubric}

Score (1-10):`,
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';
  try {
    // 尝试解析 JSON
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { score: Math.min(10, Math.max(1, Number(parsed.score))), reason: parsed.reason ?? '' };
    }
  } catch {}
  // fallback: 尝试提取数字
  const numMatch = content.match(/(\d+)/);
  return { score: numMatch ? Math.min(10, Math.max(1, Number(numMatch[1]))) : 5, reason: content };
}

/**
 * 运行单个用例
 */
async function runCase(caseDef: BenchmarkCase): Promise<CaseResult> {
  const start = Date.now();
  try {
    // 执行 vibe 调用
    const callable = (v as any)[caseDef.functionName](...caseDef.args);
    const result = caseDef.schema ? await callable(caseDef.schema) : await callable;
    const timeMs = Date.now() - start;

    // 评分
    if (caseDef.exactCheck) {
      const passed = caseDef.exactCheck(result);
      return {
        case: caseDef,
        result,
        score: passed ? 10 : 0,
        scoreReason: passed ? 'Exact match ✅' : `Expected check failed. Got: ${JSON.stringify(result)}`,
        timeMs,
      };
    }

    if (caseDef.rubric) {
      const { score, reason } = await judgeWithLLM(caseDef, result);
      return { case: caseDef, result, score, scoreReason: reason, timeMs };
    }

    return { case: caseDef, result, score: 10, scoreReason: 'No check defined, assumed pass', timeMs };
  } catch (error) {
    return {
      case: caseDef,
      error: error instanceof Error ? error.message : String(error),
      score: 0,
      scoreReason: `Execution failed: ${error instanceof Error ? error.message : error}`,
      timeMs: Date.now() - start,
    };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        Vibe Benchmark Suite              ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const results: CaseResult[] = [];

  for (const caseDef of cases) {
    process.stdout.write(`  [${caseDef.dimension}] ${caseDef.name}...`);
    const result = await runCase(caseDef);
    results.push(result);
    const icon = result.score >= 8 ? '✅' : result.score >= 5 ? '⚠️' : '❌';
    console.log(` ${icon} ${result.score}/10 (${(result.timeMs / 1000).toFixed(1)}s)`);
  }

  // 汇总报告
  console.log('\n══════════════════════════════════════════');
  console.log('  SUMMARY BY DIMENSION');
  console.log('══════════════════════════════════════════\n');

  const dimensions = [...new Set(cases.map(c => c.dimension))];
  let totalScore = 0;
  let totalCases = 0;

  for (const dim of dimensions) {
    const dimResults = results.filter(r => r.case.dimension === dim);
    const avgScore = dimResults.reduce((s, r) => s + r.score, 0) / dimResults.length;
    const passed = dimResults.filter(r => r.score >= 8).length;
    const failed = dimResults.filter(r => r.score < 5);
    totalScore += dimResults.reduce((s, r) => s + r.score, 0);
    totalCases += dimResults.length;

    console.log(`  ${dim}: ${avgScore.toFixed(1)}/10 (${passed}/${dimResults.length} passed)`);
    for (const f of failed) {
      console.log(`    ❌ ${f.case.name}: ${f.scoreReason.slice(0, 100)}`);
    }
  }

  const overallAvg = totalScore / totalCases;
  console.log(`\n  OVERALL: ${overallAvg.toFixed(1)}/10 (${totalCases} cases)\n`);

  // 详细结果
  console.log('══════════════════════════════════════════');
  console.log('  DETAILED RESULTS');
  console.log('══════════════════════════════════════════\n');

  for (const r of results) {
    const icon = r.score >= 8 ? '✅' : r.score >= 5 ? '⚠️' : '❌';
    console.log(`${icon} [${r.case.dimension}] ${r.case.name} — ${r.score}/10`);
    console.log(`   Reason: ${r.scoreReason.slice(0, 150)}`);
    if (r.error) {
      console.log(`   Error: ${r.error.slice(0, 150)}`);
    } else if (r.result !== undefined) {
      const resultStr = typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
      console.log(`   Result: ${resultStr.slice(0, 150)}`);
    }
    console.log();
  }
}

main().catch(console.error);
