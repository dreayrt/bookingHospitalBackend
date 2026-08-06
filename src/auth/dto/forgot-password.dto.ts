import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SendForgotOtpDto {
  @IsNotEmpty({ message: 'Vui lòng nhập email hoặc tên đăng nhập!' })
  @IsString()
  email: string;
}

export class VerifyForgotOtpDto {
  @IsNotEmpty({ message: 'Vui lòng nhập email!' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP!' })
  @IsString()
  otp: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Vui lòng nhập email!' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!' })
  @IsString()
  resetToken: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới!' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' })
  newPassword: string;
}
