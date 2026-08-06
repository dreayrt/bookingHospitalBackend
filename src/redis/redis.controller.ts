import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Kiểm tra trạng thái kết nối máy ảo Redis (Docker VM)
   * GET /redis/status
   */
  @Get('status')
  getStatus() {
    return {
      success: true,
      status: this.redisService.getStatus(),
    };
  }

  /**
   * Ping thử Redis để kiểm tra độ trễ (latency)
   * GET /redis/ping
   */
  @Get('ping')
  async ping() {
    const start = Date.now();
    const result = await this.redisService.ping();
    const latencyMs = Date.now() - start;

    return {
      success: true,
      message: result,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Lấy danh sách key trong Redis theo pattern (VD: * hoặc otp:*, cache:*)
   * GET /redis/keys?pattern=*
   */
  @Get('keys')
  async getKeys(@Query('pattern') pattern?: string) {
    const searchPattern = pattern || '*';
    const keys = await this.redisService.keys(searchPattern);
    return {
      success: true,
      pattern: searchPattern,
      count: keys.length,
      keys,
    };
  }

  /**
   * Xem giá trị và TTL của 1 key cụ thể
   * GET /redis/key/:key
   */
  @Get('key/:key')
  async getKey(@Param('key') key: string) {
    const value = await this.redisService.get(key);
    const ttl = await this.redisService.ttl(key);
    const exists = await this.redisService.exists(key);

    return {
      success: true,
      key,
      exists,
      value,
      ttlSeconds: ttl,
    };
  }

  /**
   * Xóa một key cụ thể khỏi Redis
   * DELETE /redis/key/:key
   */
  @Delete('key/:key')
  @HttpCode(HttpStatus.OK)
  async deleteKey(@Param('key') key: string) {
    await this.redisService.del(key);
    return {
      success: true,
      message: `Đã xóa key "${key}" khỏi Redis`,
    };
  }

  /**
   * Xóa toàn bộ key cache theo pattern
   * DELETE /redis/cache?pattern=cache:*
   */
  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async clearCache(@Query('pattern') pattern?: string) {
    const searchPattern = pattern || 'cache:*';
    const deletedCount = await this.redisService.delByPattern(searchPattern);
    return {
      success: true,
      message: `Đã dọn dẹp ${deletedCount} key cache theo mẫu "${searchPattern}"`,
      deletedCount,
    };
  }
}
