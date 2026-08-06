import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty({ message: 'Email từ Google không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty({ message: 'Họ tên từ Google không được để trống' })
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  googleToken?: string;

  @IsOptional()
  @IsString()
  googleId?: string;
}
