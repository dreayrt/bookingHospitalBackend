import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { NotificationService, NotificationItem } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(
    @Query('role') role?: string,
    @Query('userId') userId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('email') email?: string,
    @Query('username') username?: string,
    @Query('phone') phone?: string,
  ) {
    return this.notificationService.findAll({
      role,
      userId,
      doctorId,
      patientId,
      email,
      username,
      phone,
    });
  }

  @Post()
  async create(@Body() data: Partial<NotificationItem>) {
    return this.notificationService.createNotification(data);
  }

  @Patch('read-all')
  async markAllAsRead(
    @Query('role') role?: string,
    @Query('userId') userId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('email') email?: string,
  ) {
    return this.notificationService.markAllAsRead({
      role,
      userId,
      doctorId,
      patientId,
      email,
    });
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Delete('clear-all')
  async clearAll(
    @Query('role') role?: string,
    @Query('userId') userId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('email') email?: string,
  ) {
    return this.notificationService.clearAll({
      role,
      userId,
      doctorId,
      patientId,
      email,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
