import { promises as fs } from 'fs';
import { join } from 'path';
import { CacheKey, CacheItem } from './types.js';

/**
 * 缓存管理器
 */
export class FunctionCacheManager {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * 初始化缓存目录
   */
  async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
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
   */
  private serializeKey(key: CacheKey): string {
    return Buffer.from(JSON.stringify(key)).toString('base64');
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
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    await fs.rm(this.cacheDir, { recursive: true, force: true });
  }
}
