import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// DTO cho từng món thuốc trong đơn
export class PrescriptionDetailItemDto {
  @IsNotEmpty()
  @IsString()
  medicineName: string; // Tên thuốc (VD: "Paracetamol 500mg")

  @IsOptional()
  @IsString()
  dosage?: string; // Liều dùng (VD: "1 viên/lần")

  @IsOptional()
  @IsString()
  frequency?: string; // Tần suất (VD: "Sáng - Tối sau ăn")

  @IsOptional()
  @IsString()
  duration?: string; // Thời gian (VD: "5 ngày")

  @IsOptional()
  @IsString()
  instruction?: string; // Hướng dẫn (VD: "Uống với nhiều nước")
}

// DTO tổng gửi từ Frontend lên
export class CreateEmrPrescriptionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  appointmentId: number; // ID của lịch hẹn khám

  // --- Hồ sơ bệnh án (medical_records) ---
  @IsOptional()
  @IsString()
  symptoms?: string; // Triệu chứng

  @IsOptional()
  @IsString()
  diagnosis?: string; // Chẩn đoán bệnh

  @IsOptional()
  @IsString()
  treatmentPlan?: string; // Kế hoạch điều trị / Hướng xử trí

  @IsOptional()
  @IsString()
  notes?: string; // Ghi chú của bác sĩ

  // --- Danh sách thuốc (prescription_details) ---
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDetailItemDto)
  medicines: PrescriptionDetailItemDto[];
}
