import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AppointmentModule } from './appointment/appointment.module';
import { DoctorModule } from './doctor/doctor.module';
import { AppointmentController } from './appointment/appointment.controller';
import { AppointmentService } from './appointment/appointment.service';
import { MedicalRecordsModule } from './medical_records/medical_records.module';
import { DoctorSchedulesModule } from './doctor_schedules/doctor_schedules.module';
import { DepartmentModule } from './department/department.module';
import { PrescriptionDetailsModule } from './prescription_details/prescription_details.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
    SmsModule,
    AuthModule,
    NotificationModule,
    AppointmentModule,
    DoctorModule,
    MedicalRecordsModule,
    DoctorSchedulesModule,
    DepartmentModule,
    PrescriptionDetailsModule,
    PrescriptionsModule,
    PaymentModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppModule {}

