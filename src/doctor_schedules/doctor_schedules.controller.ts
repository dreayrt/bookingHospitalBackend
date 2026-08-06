import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  //  Patch, Delete
} from '@nestjs/common';
import { DoctorSchedulesService } from './doctor_schedules.service';
import { CreateDoctorScheduleDto } from './dto/create-doctor_schedule.dto';
// import { UpdateDoctorScheduleDto } from './dto/update-doctor_schedule.dto';

@Controller('doctor-schedules')
export class DoctorSchedulesController {
  constructor(
    private readonly doctorSchedulesService: DoctorSchedulesService,
  ) {}

  @Post('bulk-save')
  async bulkSaveSchedules(@Body() dto: CreateDoctorScheduleDto) {
    return this.doctorSchedulesService.bulkSaveSchedules(dto);
  }

  // @Get()
  // findAll() {
  //   return this.doctorSchedulesService.findAll();
  // }

  @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.doctorSchedulesService.findByDoctor(+doctorId); //+ dung de ep kieu tu string sang number
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateDoctorScheduleDto: UpdateDoctorScheduleDto,
  // ) {
  //   return this.doctorSchedulesService.update(+id, updateDoctorScheduleDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.doctorSchedulesService.remove(+id);
  // }
}
