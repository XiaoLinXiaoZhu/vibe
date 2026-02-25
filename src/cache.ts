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
   * 文件不存在时返回 null；文件损坏时删除并返回 null
   */
  async get(key: CacheKey): Promise<CacheItem | null> {
    const cachePath = this.getCachePath(key);
    let content: string;
    try {
      content = await fs.readFile(cachePath, 'utf-8');
    } catch (error: any) {
      // 文件不存在是正常情况
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
    try {
      return JSON.parse(content) as CacheItem;
    } catch {
      // JSON 损坏：删除坏文件，视为缓存未命中
      console.warn(`[vibe] Corrupted cache file removed: ${cachePath}`);
      await fs.unlink(cachePath).catch(() => {});
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
   * 将函数名转为安全的文件名
   * 保留中文字符，替换文件系统不安全的字符
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 替换文件系统不安全字符
      .replace(/\s+/g, '_')                     // 空格转下划线
      .replace(/_+/g, '_')                      // 合并连续下划线
      .replace(/^_|_$/g, '')                    // 去除首尾下划线
      .slice(0, 200)                            // 限制长度
      || 'unnamed';                             // 空名兜底
  }

  /**
   * 生成可预览的 JS 文件到 review 目录
   */
  private async writeReviewFile(functionName: string, code: string): Promise<void> {
    try {
      const safeName = this.sanitizeFileName(functionName);
      const reviewPath = join(this.reviewDir, `${safeName}.js`);
      const wrappedCode = `// Original function name: ${functionName}\nasync function ${safeName}(args, v, z) {\n${code}\n}`;
      await fs.writeFile(reviewPath, wrappedCode, 'utf-8');
    } catch (error) {
      // review 文件写入失败不应影响主流程
      console.warn(`[vibe] Failed to write review file for "${functionName}":`, error);
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
