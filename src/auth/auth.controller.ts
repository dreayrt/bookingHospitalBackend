import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import {
  SendForgotOtpDto,
  VerifyForgotOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * API Đăng nhập bằng tên đăng nhập (username) và mật khẩu
   * POST http://localhost:3000/auth/login
   * Body: { "username": "doctor2", "pass": "123456" } hoặc { "username": "doctor2", "password": "123456" }
   */
  @Post('login')
  async login(@Body() body: { username: string; pass?: string; password?: string }) {
    const password = body.pass || body.password || '';
    return this.authService.login(body.username, password);
  }

  /**
   * API Đăng ký tài khoản người dùng mới
   * POST http://localhost:3000/auth/register
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * API Đăng nhập bằng Google OAuth2
   * POST http://localhost:3000/auth/google-login
   */
  @Post('google-login')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  /**
   * API 1: Gửi mã OTP khôi phục mật khẩu qua Gmail
   * POST http://localhost:3000/auth/forgot-password/send-otp
   */
  @Post('forgot-password/send-otp')
  async sendForgotOtp(@Body() dto: SendForgotOtpDto) {
    return this.authService.sendForgotOtp(dto);
  }

  /**
   * API 2: Xác thực mã OTP
   * POST http://localhost:3000/auth/forgot-password/verify-otp
   */
  @Post('forgot-password/verify-otp')
  async verifyForgotOtp(@Body() dto: VerifyForgotOtpDto) {
    return this.authService.verifyForgotOtp(dto);
  }

  /**
   * API 3: Đặt lại mật khẩu mới
   * POST http://localhost:3000/auth/forgot-password/reset-password
   */
  @Post('forgot-password/reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * API tra cứu email theo account (username hoặc email)
   * GET http://localhost:3000/auth/forgot-password/get-email?account=doctor2
   */
  @Get('forgot-password/get-email')
  async getEmailByAccount(@Query('account') account: string) {
    return this.authService.getEmailByAccount(account);
  }
}

