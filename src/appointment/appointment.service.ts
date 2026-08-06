import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // create(createAppointmentDto: CreateAppointmentDto) {
  //   return 'This action adds a new appointment';
  // }

  async findAll(query?: {
    userId?: string;
    doctorId?: string;
    patientId?: string;
    username?: string;
  }) {
    const whereClause: any = {};

    if (query?.doctorId && !isNaN(Number(query.doctorId))) {
      const idVal = BigInt(query.doctorId);
      whereClause.OR = [
        { doctor_id: idVal },
        { doctors: { user_id: idVal } },
      ];
    } else if (query?.patientId && query.patientId.trim() !== '') {
      const pid = query.patientId.trim();
      whereClause.OR = [
        { patients: { patient_code: pid } },
        { patients: { users: { username: pid } } },
        { patients: { users: { email: pid } } },
      ];
      if (!isNaN(Number(pid))) {
        const idVal = BigInt(pid);
        whereClause.OR.push(
          { patient_id: idVal },
          { patients: { user_id: idVal } },
          { patients: { id: idVal } },
        );
      }
    } else if (query?.userId && !isNaN(Number(query.userId))) {
      const idVal = BigInt(query.userId);
      whereClause.OR = [
        { doctor_id: idVal },
        { patient_id: idVal },
        { doctors: { user_id: idVal } },
        { patients: { user_id: idVal } },
      ];
    } else if (query?.username && query.username.trim() !== '') {
      const uname = query.username.trim();
      whereClause.OR = [
        { doctors: { users: { username: uname } } },
        { patients: { users: { username: uname } } },
      ];
    }

    const appointments = await this.prisma.appointments.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      select: {
        id: true,
        reason: true,
        status: true,
        appointment_date: true,
        appointment_time: true,
        doctor_id: true,
        patient_id: true,
        doctors: {
          select: {
            id: true,
            user_id: true,
            users: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
        patients: {
          select: {
            id: true,
            user_id: true,
            users: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
    return appointments.map((item) => ({
      id: item.id.toString(), // <-- Đổi BigInt sang string ở đây
      doctor_id: item.doctor_id?.toString() || '',
      patient_id: item.patient_id?.toString() || '',
      doctor_user_id: item.doctors?.user_id?.toString() || item.doctors?.id?.toString() || '',
      patient_user_id: item.patients?.user_id?.toString() || item.patients?.id?.toString() || '',
      doctor_username: item.doctors?.users?.username || '',
      patient_username: item.patients?.users?.username || '',
      doctor_name: item.doctors?.users?.full_name || 'N/A',
      patient_name: item.patients?.users?.full_name || 'N/A',
      reason: item.reason,
      status: item.status,
      appointment_date: item.appointment_date,
      appointment_time: item.appointment_time,
    }));
  }

  async findByPatientId(patientId: string) {
    if (!patientId || patientId.trim() === '') {
      throw new BadRequestException('ID bệnh nhân không được để trống');
    }

    const trimmedId = patientId.trim();
    const whereConditions: any[] = [
      { patients: { patient_code: trimmedId } },
      { patients: { users: { username: trimmedId } } },
      { patients: { users: { email: trimmedId } } },
      { patients: { users: { phone: trimmedId } } },
    ];

    if (!isNaN(Number(trimmedId))) {
      const idVal = BigInt(trimmedId);
      whereConditions.push(
        { patient_id: idVal },
        { patients: { user_id: idVal } },
        { patients: { id: idVal } },
        { id: idVal },
      );
    }

    const appointments = await this.prisma.appointments.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        appointment_date: true,
        appointment_time: true,
        created_at: true,
        doctor_id: true,
        patient_id: true,
        doctors: {
          select: {
            id: true,
            user_id: true,
            specialization: true,
            departments: {
              select: {
                name: true,
              },
            },
            users: {
              select: {
                id: true,
                username: true,
                full_name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        patients: {
          select: {
            id: true,
            user_id: true,
            patient_code: true,
            users: {
              select: {
                id: true,
                username: true,
                full_name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { appointment_date: 'desc' },
        { id: 'desc' },
      ],
    });

    return appointments.map((item) => ({
      id: item.id.toString(),
      doctor_id: item.doctor_id?.toString() || '',
      patient_id: item.patient_id?.toString() || '',
      doctor_user_id:
        item.doctors?.user_id?.toString() ||
        item.doctors?.id?.toString() ||
        '',
      patient_user_id:
        item.patients?.user_id?.toString() ||
        item.patients?.id?.toString() ||
        '',
      doctor_username: item.doctors?.users?.username || '',
      patient_username: item.patients?.users?.username || '',
      doctor_name: item.doctors?.users?.full_name || 'N/A',
      doctor_phone: item.doctors?.users?.phone || '',
      doctor_email: item.doctors?.users?.email || '',
      department_name: item.doctors?.departments?.name || 'N/A',
      specialization: item.doctors?.specialization || '',
      patient_name: item.patients?.users?.full_name || 'N/A',
      patient_phone: item.patients?.users?.phone || '',
      patient_email: item.patients?.users?.email || '',
      patient_code: item.patients?.patient_code || '',
      reason: item.reason,
      status: item.status,
      appointment_date: item.appointment_date,
      appointment_time: item.appointment_time,
      created_at: item.created_at,
    }));
  }

  async createBooking(dto: CreateBookingDto) {
    const schedule = await this.prisma.doctor_schedules.findFirst({
      where: {
        doctor_id: BigInt(dto.doctorId),
        work_date: new Date(dto.appointmentDate),
        status: 'AVAILABLE',
      },
      include: {
        doctors: {
          include: {
            departments: {
              select: {
                name: true,
              },
            },
            users: {
              select: {
                full_name: true,
              },
            },
          },
        },
        
      },
    });
    if (!schedule) {
      throw new BadRequestException(
        'Không có lịch làm việc trong ngày được chọn! Vui lòng chọn ngày khác.',
      );
    }
  
    return await this.prisma.$transaction(async (tx) => {
      // Ưu tiên tìm user theo email, nếu không có mới tìm theo phone (tránh trùng phone mặc định)
      let user: any = null;
      if (dto.email && dto.email.trim() !== '') {
        user = await tx.users.findFirst({
          where: { email: dto.email.trim() },
          include: {
            patients: true,
          },
        });
      }
      if (!user && dto.phone && dto.phone.trim() !== '' && dto.phone.trim() !== '0901234567') {
        user = await tx.users.findFirst({
          where: { phone: dto.phone.trim() },
          include: {
            patients: true,
          },
        });
      }

      let patientId: bigint;
      if (user && user.patients) {
        // Đã có hồ sơ bệnh nhân -> dùng lại ID cũ
        patientId = user.patients.id;
      } else if (user && !user.patients) {
        // Đã có tài khoản user nhưng chưa có bảng patients -> chỉ tạo profile patients
        const newPatientCode = `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newPatient = await tx.patients.create({
          data: {
            user_id: user.id,
            patient_code: newPatientCode,
            dob: dto.dob ? new Date(dto.dob) : null,
            gender: dto.gender || 'OTHER',
          },
        });
        patientId = newPatient.id;
      } else {
        // Chưa có user và patient -> tạo mới cả 2
        const patientRole = await tx.roles.findFirst({
          where: { name: 'PATIENT' },
        });
        const cleanEmail = dto.email?.trim() || `bn_${Date.now()}@aurahealth.vn`;
        const newUserId = await tx.users.create({
          data: {
            email: cleanEmail,
            phone: dto.phone?.trim() || null,
            full_name: dto.fullName?.trim() || 'Bệnh Nhân VIP',
            username: cleanEmail,
            password: '',
            role_id: patientRole?.id || 3n,
          },
        });
        const newPatientCode = `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newPatient = await tx.patients.create({
          data: {
            user_id: newUserId.id,
            patient_code: newPatientCode,
            dob: dto.dob ? new Date(dto.dob) : null,
            gender: dto.gender || 'OTHER',
          },
        });
        patientId = newPatient.id;
      }
        const newAppointment = await tx.appointments.create({
        data: {
          patient_id: patientId,
          doctor_id: BigInt(dto.doctorId),
          appointment_date: new Date(dto.appointmentDate),
          appointment_time: new Date(`1970-01-01T${dto.appointmentTime}Z`),
          reason: dto.reason || 'Khám bệnh theo yêu cầu',
          status: 'PENDING',
        },
      });

      // Tự động tạo Invoice kèm theo số tiền khám mặc định (150.000 VNĐ)
      const invoiceCode = `PK${newAppointment.id}`;
      const newInvoice = await tx.invoices.create({
        data: {
          patient_id: patientId,
          appointment_id: newAppointment.id,
          invoice_code: invoiceCode,
          total_amount: 150000,
          status: 'PENDING',
        },
      });

      const resultData = {
        appointmentId: newAppointment.id.toString(),
        patientId: patientId.toString(),
        patientName: dto.fullName,
        doctorName: schedule.doctors?.users?.full_name || 'N/A',
        departmentName: schedule.doctors?.departments?.name || 'N/A',
        date: dto.appointmentDate,
        time: dto.appointmentTime,
        status: 'PENDING',
        invoiceCode: newInvoice.invoice_code,
        amount: 150000,
      };

      try {
        await this.notificationService.createNotification({
          title: '🎉 Đặt lịch khám VIP thành công!',
          message: `Lịch hẹn với ${resultData.doctorName} (${resultData.departmentName}) lúc ${dto.appointmentTime} ngày ${dto.appointmentDate} đã được ghi nhận.`,
          role: 'patient',
          targetId: patientId.toString(),
          email: dto.email,
          phone: dto.phone,
          type: 'BOOKING_SUCCESS',
        });

        await this.notificationService.createNotification({
          title: '🏥 Có bệnh nhân mới vào hàng đợi!',
          message: `BN. ${dto.fullName} vừa đăng ký lịch khám VIP lúc ${dto.appointmentTime} ngày ${dto.appointmentDate}. Lý do: ${dto.reason || 'Khám bệnh theo yêu cầu'}.`,
          role: 'doctor',
          targetId: dto.doctorId.toString(),
          type: 'NEW_QUEUE_PATIENT',
        });
      } catch (err) {
        // Không chặn flow nếu tạo notification lỗi
      }

      return {
        success: true,
        message: 'Đặt lịch khám thành công! Vui lòng chờ bệnh viện xác nhận.',
        data: resultData,
      };
    });
  }

  async confirmAppointment(id: string) {
    const updated = await this.prisma.appointments.update({
      where: { id: BigInt(id) },
      data: { status: 'CONFIRMED' },
    });
    return {
      success: true,
      message: 'Đã xác nhận lịch khám thành công!',
      data: {
        id: updated.id.toString(),
        status: updated.status,
      },
    };
  }

  async updateStatus(id: string, status: string) {
    const updated = await this.prisma.appointments.update({
      where: { id: BigInt(id) },
      data: { status: status as any },
    });
    return {
      success: true,
      message: 'Cập nhật trạng thái lịch khám thành công!',
      data: {
        id: updated.id.toString(),
        status: updated.status,
      },
    };
  }
}


  // findOne(id: number) {
  //   return `This action returns a #${id} appointment`;
  // }

  // update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
  //   return `This action updates a #${id} appointment`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} appointment`;
  // }

