import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // Fallback in-memory map nếu Redis server chưa khả dụng
  private readonly fallbackMemory = new Map<
    string,
    { value: string; expiresAt: number | null }
  >();

  async onModuleInit() {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT) || 6379;
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const redisDb = Number(process.env.REDIS_DB) || 0;

    try {
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn(
              `⚠️ [RedisService] Đã thử kết nối ${times} lần tới ${redisHost}:${redisPort} không thành công. Chuyển sang chế độ In-Memory Fallback.`,
            );
            return null; // Dừng retry tự động sau 5 lần
          }
          const delay = Math.min(times * 500, 3000);
          this.logger.log(
            `🔄 [RedisService] Đang thử kết nối lại Redis lần ${times} sau ${delay}ms...`,
          );
          return delay;
        },
      });

      this.redisClient.on('connect', () => {
        this.logger.log(
          `🔗 [RedisService] Đang kết nối tới Redis VM (${redisHost}:${redisPort})...`,
        );
      });

      this.redisClient.on('ready', () => {
        this.isRedisConnected = true;
        this.logger.log(
          `✅ [RedisService] Đã kết nối Redis VM thành công (${redisHost}:${redisPort} | DB: ${redisDb})`,
        );
      });

      this.redisClient.on('error', (err) => {
        if (this.isRedisConnected) {
          this.logger.warn(`⚠️ [RedisService] Lỗi kết nối Redis: ${err.message}`);
          this.isRedisConnected = false;
        }
      });

      this.redisClient.on('close', () => {
        if (this.isRedisConnected) {
          this.logger.warn(`⚠️ [RedisService] Kết nối Redis đã đóng.`);
          this.isRedisConnected = false;
        }
      });

      await this.redisClient.connect();
      this.isRedisConnected = true;
      this.logger.log(
        `✅ [RedisService] Sẵn sàng sử dụng Redis tại máy ảo ${redisHost}:${redisPort} (DB ${redisDb})`,
      );
    } catch (err) {
      this.isRedisConnected = false;
      this.logger.warn(
        `⚠️ [RedisService] Không thể kết nối ngay tới Redis (${redisHost}:${redisPort}): ${err.message}. Tự động chuyển sang chế độ In-Memory Fallback cho tới khi Redis khả dụng.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => null);
    }
  }

  /**
   * Kiểm tra trạng thái kết nối Redis
   */
  getStatus() {
    return {
      connected: this.isRedisConnected,
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      db: Number(process.env.REDIS_DB) || 0,
      mode: this.isRedisConnected ? 'redis-vm' : 'memory-fallback',
      inMemoryKeysCount: this.fallbackMemory.size,
    };
  }

  /**
   * Kiểm tra kết nối Redis (PING -> PONG)
   */
  async ping(): Promise<string> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.ping();
      } catch (err) {
        this.logger.error(`Lỗi Redis ping(): ${err.message}`);
      }
    }
    return 'PONG (In-Memory Fallback)';
  }

  /**
   * Lưu giá trị vào Redis với TTL (giây)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, value);
        }
        return;
      } catch (err) {
        this.logger.error(`Lỗi ghi Redis set(${key}): ${err.message}`);
      }
    }

    // Fallback in-memory
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.fallbackMemory.set(key, { value, expiresAt });
  }

  /**
   * Đọc giá trị từ Redis theo key
   */
  async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (err) {
        this.logger.error(`Lỗi đọc Redis get(${key}): ${err.message}`);
      }
    }

    // Fallback in-memory
    const item = this.fallbackMemory.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.fallbackMemory.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Xóa key trong Redis
   */
  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        this.logger.error(`Lỗi xóa Redis del(${key}): ${err.message}`);
      }
    }

    this.fallbackMemory.delete(key);
  }

  /**
   * Tăng giá trị key (dùng cho Rate Limiting), trả về giá trị sau khi tăng
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const val = await this.redisClient.incr(key);
        if (val === 1 && ttlSeconds && ttlSeconds > 0) {
          await this.redisClient.expire(key, ttlSeconds);
        }
        return val;
      } catch (err) {
        this.logger.error(`Lỗi Redis incr(${key}): ${err.message}`);
      }
    }

    // Fallback in-memory
    const current = await this.get(key);
    const nextVal = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, String(nextVal), ttlSeconds);
    return nextVal;
  }

  /**
   * Kiểm tra key có tồn tại trong Redis không
   */
  async exists(key: string): Promise<boolean> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const count = await this.redisClient.exists(key);
        return count > 0;
      } catch (err) {
        this.logger.error(`Lỗi Redis exists(${key}): ${err.message}`);
      }
    }

    const val = await this.get(key);
    return val !== null;
  }

  /**
   * Kiểm tra TTL còn lại của key (giây)
   */
  async ttl(key: string): Promise<number> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.ttl(key);
      } catch (err) {
        this.logger.error(`Lỗi Redis ttl(${key}): ${err.message}`);
      }
    }

    const item = this.fallbackMemory.get(key);
    if (!item || !item.expiresAt) return -1;
    const remain = Math.floor((item.expiresAt - Date.now()) / 1000);
    return remain > 0 ? remain : -2;
  }

  /**
   * Gia hạn TTL cho key đã tồn tại
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const res = await this.redisClient.expire(key, ttlSeconds);
        return res === 1;
      } catch (err) {
        this.logger.error(`Lỗi Redis expire(${key}): ${err.message}`);
      }
    }

    const item = this.fallbackMemory.get(key);
    if (!item) return false;
    item.expiresAt = Date.now() + ttlSeconds * 1000;
    this.fallbackMemory.set(key, item);
    return true;
  }

  /**
   * Lấy danh sách key theo pattern (VD: "otp:*", "cache:*")
   */
  async keys(pattern: string): Promise<string[]> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.keys(pattern);
      } catch (err) {
        this.logger.error(`Lỗi Redis keys(${pattern}): ${err.message}`);
      }
    }

    const result: string[] = [];
    const regexPattern = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    for (const key of this.fallbackMemory.keys()) {
      if (regexPattern.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Lưu đối tượng/mảng dưới dạng JSON string vào Redis
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const jsonStr = JSON.stringify(value);
    await this.set(key, jsonStr, ttlSeconds);
  }

  /**
   * Đọc đối tượng/mảng từ JSON string trong Redis
   */
  async getJson<T>(key: string): Promise<T | null> {
    const jsonStr = await this.get(key);
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr) as T;
    } catch (err) {
      this.logger.error(`Lỗi parse JSON Redis key(${key}): ${err.message}`);
      return null;
    }
  }

  /**
   * Xóa danh sách key theo pattern
   */
  async delByPattern(pattern: string): Promise<number> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          return await this.redisClient.del(...keys);
        }
        return 0;
      } catch (err) {
        this.logger.error(
          `Lỗi xóa theo pattern delByPattern(${pattern}): ${err.message}`,
        );
      }
    }

    let deletedCount = 0;
    const regexPattern = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    for (const key of this.fallbackMemory.keys()) {
      if (regexPattern.test(key)) {
        this.fallbackMemory.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }
}

