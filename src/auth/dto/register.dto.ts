import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;

  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  roleId?: number | string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
