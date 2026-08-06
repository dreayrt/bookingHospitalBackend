import { Module } from '@nestjs/common';
import { DoctorSchedulesService } from './doctor_schedules.service';
import { DoctorSchedulesController } from './doctor_schedules.controller';

@Module({
  controllers: [DoctorSchedulesController],
  providers: [DoctorSchedulesService],
})
export class DoctorSchedulesModule {}
