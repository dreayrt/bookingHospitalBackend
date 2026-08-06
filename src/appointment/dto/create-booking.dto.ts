import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CreateBookingDto {
  // --- Thông tin Bệnh nhân ---
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  dob?: string; // "1995-10-25"

  @IsOptional()
  @IsString()
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  // --- Thông tin Đặt lịch ---
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  doctorId: number;

  @IsNotEmpty()
  @IsString()
  appointmentDate: string; // "2026-08-01"

  @IsNotEmpty()
  @IsString()
  appointmentTime: string; // "08:30:00"

  @IsOptional()
  @IsString()
  reason?: string; // Triệu chứng / Lý do khám
}
