import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  // Delete,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('appointment')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('username') username?: string,
  ) {
    return this.appointmentService.findAll({ userId, doctorId, patientId, username });
  }

  @Get('patient/:patientId')
  async getByPatientId(@Param('patientId') patientId: string) {
    return this.appointmentService.findByPatientId(patientId);
  }

  @Post('booking')
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.appointmentService.createBooking(dto);
  }

  @Patch(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.appointmentService.confirmAppointment(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.appointmentService.updateStatus(id, status);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.appointmentService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateAppointmentDto: UpdateAppointmentDto,
  // ) {
  //   return this.appointmentService.update(+id, updateAppointmentDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.appointmentService.remove(+id);
  // }
}
