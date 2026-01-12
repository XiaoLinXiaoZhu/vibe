import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { CacheKey, CacheItem } from './types.js';

/**
 * 缓存管理器
 */
export class FunctionCacheManager {
  private cacheDir: string;
  private reviewDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.reviewDir = join(cacheDir, 'review');
  }

  /**
   * 初始化缓存目录
   */
  async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(this.reviewDir, { recursive: true });
  }

  /**
   * 生成缓存文件路径
   */
  private getCachePath(key: CacheKey): string {
    const keyStr = this.serializeKey(key);
    return join(this.cacheDir, `${keyStr}.json`);
  }

  /**
   * 序列化缓存键
   * 使用 SHA256 哈希避免文件名过长
   */
  private serializeKey(key: CacheKey): string {
    const keyString = JSON.stringify(key);
    return createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * 获取缓存
   */
  async get(key: CacheKey): Promise<CacheItem | null> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content) as CacheItem;
    } catch {
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: CacheKey, item: CacheItem): Promise<void> {
    await this.init();
    const cachePath = this.getCachePath(key);
    await fs.writeFile(cachePath, JSON.stringify(item), 'utf-8');
    
    // 在 review 目录中生成可预览的 js 文件
    await this.writeReviewFile(key.functionName, item.code);
  }

  /**
   * 生成可预览的 JS 文件到 review 目录
   */
  private async writeReviewFile(functionName: string, code: string): Promise<void> {
    try {
      const reviewPath = join(this.reviewDir, `${functionName}.js`);
      const wrappedCode = `function ${functionName}(args, v, z) {
${code}
}`;
      await fs.writeFile(reviewPath, wrappedCode, 'utf-8');
    } catch (error) {
      console.error(`Failed to write review file for ${functionName}:`, error);
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    await fs.rm(this.cacheDir, { recursive: true, force: true });
    // review 目录会在 cacheDir 下一起删除
  }
}
