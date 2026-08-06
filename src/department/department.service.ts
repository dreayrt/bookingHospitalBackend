import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
// import { CreateDepartmentDto } from './dto/create-department.dto';
// import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);
  private readonly CACHE_KEY_ALL_DEPARTMENTS = 'cache:departments:all';
  private readonly CACHE_TTL_SECONDS = 3600; // Cache 1 giờ

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}
  // create(createDepartmentDto: CreateDepartmentDto) {
  //   return 'This action adds a new department';
  // }

  async findAll() {
    // 1. Kiểm tra trong Redis cache trước
    const cachedData = await this.redisService.getJson<any[]>(
      this.CACHE_KEY_ALL_DEPARTMENTS,
    );
    if (cachedData) {
      this.logger.log(`⚡ [Redis Cache HIT] Lấy danh sách khoa phòng từ máy ảo Redis (${this.CACHE_KEY_ALL_DEPARTMENTS})`);
      return cachedData;
    }

    this.logger.log(`🔍 [Redis Cache MISS] Truy vấn MySQL và lưu vào Redis (${this.CACHE_KEY_ALL_DEPARTMENTS})`);

    // 2. Nếu chưa có trong cache, truy vấn từ database
    const departments = await this.prisma.departments.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
      },
    });
    const result = departments.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      description: item.description,
      status: item.status,
    }));

    // 3. Lưu kết quả vào máy ảo Redis với thời gian sống TTL
    await this.redisService.setJson(
      this.CACHE_KEY_ALL_DEPARTMENTS,
      result,
      this.CACHE_TTL_SECONDS,
    );

    return result;
  }

  findOne(id: number) {
    return `This action returns a #${id} department`;
  }

  // update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
  //   return `This action updates a #${id} department`;
  // }

  remove(id: number) {
    return `This action removes a #${id} department`;
  }
}
