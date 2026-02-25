import { z } from 'zod';

/**
 * Benchmark 用例定义
 */
export interface BenchmarkCase {
  /** 用例名称 */
  name: string;
  /** 所属维度 */
  dimension: '数学计算' | '算法逻辑' | '趣味问题' | '角色扮演' | '信息获取';
  /** 函数名 */
  functionName: string;
  /** 参数 */
  args: unknown[];
  /** 输出 schema（可选） */
  schema?: z.ZodType<any>;
  /** 确定性验证（有精确答案时使用） */
  exactCheck?: (result: unknown) => boolean;
  /** LLM 评分 rubric（无精确答案时使用） */
  rubric?: string;
}

export const cases: BenchmarkCase[] = [
  // ===== 数学计算 =====
  {
    name: '加法',
    dimension: '数学计算',
    functionName: 'add',
    args: [123, 456],
    schema: z.number(),
    exactCheck: (r) => r === 579,
  },
  {
    name: '阶乘',
    dimension: '数学计算',
    functionName: 'factorial',
    args: [10],
    schema: z.number(),
    exactCheck: (r) => r === 3628800,
  },
  {
    name: '斐波那契',
    dimension: '数学计算',
    functionName: 'fibonacci',
    args: [10],
    schema: z.number(),
    exactCheck: (r) => r === 55,
  },
  {
    name: '素数判断-质数',
    dimension: '数学计算',
    functionName: 'isPrime',
    args: [97],
    schema: z.boolean(),
    exactCheck: (r) => r === true,
  },
  {
    name: '素数判断-合数',
    dimension: '数学计算',
    functionName: 'isPrime',
    args: [100],
    schema: z.boolean(),
    exactCheck: (r) => r === false,
  },

  // ===== 算法逻辑 =====
  {
    name: '数组排序',
    dimension: '算法逻辑',
    functionName: 'sort',
    args: [[3, 1, 4, 1, 5, 9, 2, 6]],
    schema: z.array(z.number()),
    exactCheck: (r) => JSON.stringify(r) === JSON.stringify([1, 1, 2, 3, 4, 5, 6, 9]),
  },
  {
    name: '数组去重',
    dimension: '算法逻辑',
    functionName: 'unique',
    args: [[1, 2, 2, 3, 3, 3, 4]],
    schema: z.array(z.number()),
    exactCheck: (r) => JSON.stringify(r) === JSON.stringify([1, 2, 3, 4]),
  },
  {
    name: '字符串反转',
    dimension: '算法逻辑',
    functionName: 'reverseString',
    args: ['hello world'],
    schema: z.string(),
    exactCheck: (r) => r === 'dlrow olleh',
  },
  {
    name: 'FizzBuzz',
    dimension: '算法逻辑',
    functionName: 'fizzBuzz',
    args: [15],
    schema: z.array(z.string()),
    exactCheck: (r) => {
      const arr = r as string[];
      return arr.length === 15 && arr[2] === 'Fizz' && arr[4] === 'Buzz' && arr[14] === 'FizzBuzz';
    },
  },
  {
    name: '扁平化嵌套数组',
    dimension: '算法逻辑',
    functionName: 'flatten',
    args: [[[1, [2, 3]], [4, [5, [6]]]]],
    schema: z.array(z.number()),
    exactCheck: (r) => JSON.stringify(r) === JSON.stringify([1, 2, 3, 4, 5, 6]),
  },

  // ===== 趣味问题 =====
  {
    name: '讲笑话',
    dimension: '趣味问题',
    functionName: '讲个笑话',
    args: [],
    schema: z.string(),
    rubric: '评估这个笑话的质量：1) 是否是一个完整的笑话（有铺垫和笑点）？2) 是否有趣？3) 是否有创意（不是最常见的老笑话）？',
  },
  {
    name: 'Emoji字符画',
    dimension: '趣味问题',
    functionName: '将emoji转化为字符画',
    args: ['🐱', 10, 10],
    schema: z.string(),
    rubric: '评估这个字符画：1) 是否看起来像一只猫？2) 是否使用了 ASCII 字符组成图案？3) 大小是否接近 10x10？',
  },
  {
    name: '写一首诗',
    dimension: '趣味问题',
    functionName: 'writePoem',
    args: [{ topic: 'coding', style: 'haiku' }],
    schema: z.string(),
    rubric: '评估这首诗：1) 是否是俳句格式（5-7-5 音节）？2) 是否与编程主题相关？3) 是否有诗意和美感？',
  },

  // ===== 角色扮演 =====
  {
    name: '猫娘回复',
    dimension: '角色扮演',
    functionName: '作为猫娘回复',
    args: ['今天天气真好，想出去玩'],
    schema: z.string(),
    rubric: '评估角色扮演质量：1) 是否保持猫娘人设（使用喵、颜文字等）？2) 是否真正理解并回应了用户说的"天气好想出去玩"？3) 回复是否自然有趣？',
  },
  {
    name: '莎士比亚风格',
    dimension: '角色扮演',
    functionName: '用莎士比亚风格描述',
    args: ['a programmer debugging code at 3am'],
    schema: z.string(),
    rubric: '评估风格模仿：1) 是否使用了莎士比亚式的古英语（thee, thou, hath 等）？2) 是否准确描述了程序员凌晨3点调试的场景？3) 是否有文学性和戏剧感？',
  },
  {
    name: '海盗船长',
    dimension: '角色扮演',
    functionName: '作为海盗船长回复',
    args: ['我们的船要沉了！'],
    schema: z.string(),
    rubric: '评估角色扮演：1) 是否使用海盗口吻（Arrr, matey 等）？2) 是否对"船要沉了"做出了符合角色的回应？3) 是否有趣且沉浸感强？',
  },

  // ===== 信息获取 =====
  {
    name: '列出文件',
    dimension: '信息获取',
    functionName: 'listFiles',
    args: ['.'],
    schema: z.string(),
    rubric: '评估结果：1) 是否返回了当前目录的文件列表？2) 是否包含 package.json、src 等预期文件/目录？3) 格式是否清晰可读？',
  },
  {
    name: '系统信息',
    dimension: '信息获取',
    functionName: 'getSystemInfo',
    args: [],
    schema: z.string(),
    rubric: '评估结果：1) 是否包含操作系统信息？2) 是否包含其他有用的系统信息（如 Node 版本、内存等）？3) 格式是否清晰？',
  },
  {
    name: '当前日期时间',
    dimension: '信息获取',
    functionName: 'getCurrentDateTime',
    args: [],
    schema: z.string(),
    exactCheck: (r) => {
      // 只检查是否包含当前年份
      return typeof r === 'string' && r.includes('2026');
    },
  },
];
