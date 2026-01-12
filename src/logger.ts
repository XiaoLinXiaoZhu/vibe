import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 函数名 */
  functionName: string;
  /** 输入参数 */
  args: unknown[];
  /** 输出 schema（如果有） */
  outputSchema?: string;
  /** 是否使用缓存 */
  fromCache: boolean;
  /** 生成的代码 */
  code?: string;
  /** 执行结果 */
  result?: unknown;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果有） */
  error?: string;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** LLM 请求（发送给模型的提示词） */
  llmRequest?: {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  /** LLM 响应（模型返回的原始内容） */
  llmResponse?: {
    rawContent: string;
    finishReason?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

/**
 * 日志管理器
 */
export class Logger {
  private logDir: string;

  constructor(logDir: string) {
    this.logDir = logDir;
  }

  /**
   * 初始化日志目录
   */
  async init(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * 生成日志文件名（按日期）
   */
  private getLogFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `vibe-${date}.jsonl`;
  }

  /**
   * 生成日志文件路径
   */
  private getLogPath(): string {
    return join(this.logDir, this.getLogFilename());
  }

  /**
   * 记录日志条目
   */
  async log(entry: LogEntry): Promise<void> {
    await this.init();
    
    const logPath = this.getLogPath();
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      await fs.appendFile(logPath, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * 读取日志文件内容
   */
  async readLogs(date?: string): Promise<LogEntry[]> {
    await this.init();
    
    const filename = date ? `vibe-${date}.jsonl` : this.getLogFilename();
    const logPath = join(this.logDir, filename);
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.map(line => JSON.parse(line) as LogEntry);
    } catch (error) {
      return [];
    }
  }

  /**
   * 清空所有日志
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.rm(this.logDir, { recursive: true, force: true });
    } catch {
      // 目录不存在，忽略错误
    }
  }
}
