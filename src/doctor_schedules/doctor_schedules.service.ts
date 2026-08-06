import { Injectable } from '@nestjs/common';
import { CreateDoctorScheduleDto } from './dto/create-doctor_schedule.dto';
// import { UpdateDoctorScheduleDto } from './dto/update-doctor_schedule.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DoctorSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDoctor(doctorId: number) {
    const schedules = await this.prisma.doctor_schedules.findMany({
      where: {
        doctor_id: doctorId,
      },
      select: {
        id: true,
        work_date: true,
        start_time: true,
        end_time: true,
        status: true,
        doctors: {
          select: {
            id: true,
            users: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        work_date: 'asc',
      },
    });
    return schedules.map((item) => ({
      id: item.id.toString(), // Tránh lỗi BigInt
      doctor_id: item.doctors?.id.toString(),
      doctor_name: item.doctors?.users?.full_name || 'N/A',
      work_date: item.work_date,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
    }));
  }

  // =========================================================
  // Hàm lưu lịch trực theo tháng chuẩn Prisma ORM
  // =========================================================
  async bulkSaveSchedules(dto: CreateDoctorScheduleDto) {
    const { doctorId, month, year, shift, workDates } = dto;

    // 1. Tách giờ bắt đầu và kết thúc từ shift (ví dụ "08:00 - 17:00")
    const [startTime, endTime] = (shift || '08:00 - 17:00')
      .split(' - ')
      .map((s: string) => s.trim());

    // 2. Tính ngày đầu tháng và cuối tháng để lọc
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. Xóa toàn bộ lịch trực cũ của Bác sĩ này TRONG THÁNG / NĂM đang chọn
    await this.prisma.doctor_schedules.deleteMany({
      where: {
        doctor_id: Number(doctorId),
        work_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 4. Nếu mảng workDates rỗng (Admin bỏ tick hết) thì trả về luôn
    if (!workDates || workDates.length === 0) {
      return { message: 'Đã xóa toàn bộ lịch trực trong tháng', count: 0 };
    }

    // 5. Chuẩn bị dữ liệu mới (khai báo any[] để tương thích Enum status của Prisma)
    const dataToInsert: any[] = workDates.map((dateStr: string) => ({
      doctor_id: Number(doctorId),
      work_date: new Date(dateStr),
      start_time: new Date(`1970-01-01T${startTime || '08:00'}:00.000Z`), // <-- Sửa ở đây
      end_time: new Date(`1970-01-01T${endTime || '17:00'}:00.000Z`), // <-- Sửa ở đây
      status: 'AVAILABLE',
    }));

    // 6. Lưu hàng loạt xuống Database qua Prisma
    await this.prisma.doctor_schedules.createMany({
      data: dataToInsert,
    });

    return {
      message: 'Lưu lịch trực thành công',
      count: dataToInsert.length,
    };
  }
}
