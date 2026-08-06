import {
  Controller,
  Get,
  Post,
  Body,
  //  Patch,
  Param,
  Query,
  //  Delete
} from '@nestjs/common';
import { MedicalRecordsService } from './medical_records.service';
// import { CreateMedicalRecordDto } from './dto/create-medical_record.dto';
// import { UpdateMedicalRecordDto } from './dto/update-medical_record.dto';
import { CreateEmrPrescriptionDto } from 'src/prescriptions/dto/create-emr-precription';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  // @Post()
  // create(@Body() createMedicalRecordDto: CreateMedicalRecordDto) {
  //   return this.medicalRecordsService.create(createMedicalRecordDto);
  // }

  @Get()
  findAll() {
    return this.medicalRecordsService.findAll();
  }

  @Get('statistics/patient-flow')
  async getPatientFlowSummary(
    @Query('startDate') startDate: string,
    @Query('type') type: 'day' | 'week' | 'month' | 'year' = 'day',
  ) {
    return this.medicalRecordsService.getPatientFlowSummary(
      new Date(startDate),
      type,
    );
  }

  @Post('emr-prescription')
  async createEmrPrescription(@Body() dto: CreateEmrPrescriptionDto) {
    return this.medicalRecordsService.createEmrPrescription(dto);
  }

  @Get('appointment/:appointmentId')
  async getByAppointmentId(@Param('appointmentId') appointmentId: string) {
    return this.medicalRecordsService.getByAppointmentId(appointmentId);
  }

  @Get('patient/:patientId')
  async getByPatientId(@Param('patientId') patientId: string) {
    return this.medicalRecordsService.getByPatientId(patientId);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMedicalRecordDto: UpdateMedicalRecordDto) {
  //   return this.medicalRecordsService.update(+id, updateMedicalRecordDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.medicalRecordsService.remove(+id);
  // }
}
