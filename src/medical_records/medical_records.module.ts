import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical_records.service';
import { MedicalRecordsController } from './medical_records.controller';

@Module({
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
