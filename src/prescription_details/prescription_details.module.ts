import { Module } from '@nestjs/common';
import { PrescriptionDetailsService } from './prescription_details.service';
import { PrescriptionDetailsController } from './prescription_details.controller';

@Module({
  controllers: [PrescriptionDetailsController],
  providers: [PrescriptionDetailsService],
})
export class PrescriptionDetailsModule {}
