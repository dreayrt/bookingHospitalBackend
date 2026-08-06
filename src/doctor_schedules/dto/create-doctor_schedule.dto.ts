import { IsNumber, IsString, IsArray, IsNotEmpty } from 'class-validator';
export class CreateDoctorScheduleDto {
  @IsNotEmpty()
  doctorId: number | string;
  @IsNumber()
  month: number;
  @IsNumber()
  year: number;
  @IsString()
  shift: string;
  @IsArray()
  workDates: string[];
}
