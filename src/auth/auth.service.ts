import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import {
  SendForgotOtpDto,
  VerifyForgotOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {}

  // 1. Đăng ký tài khoản mới (Register)
  async register(dto: RegisterDto) {
    // Kiểm tra trùng username hoặc email
    const existingUser = await this.prisma.users.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Tên đăng nhập hoặc Email đã tồn tại trong hệ thống!',
      );
    }

    // Mã hoá mật khẩu theo chuẩn SHA-256 (khớp với SHA2(pass, 256) trong MySQL)
    const hashedPassword = crypto
      .createHash('sha256')
      .update(dto.password)
      .digest('hex')
      .toLowerCase();

    // Mặc định vai trò khi đăng ký tài khoản luôn là Bệnh nhân (role_id = 3)
    const roleIdVal = BigInt(3);

    // Tạo user mới vào database
    const newUser = await this.prisma.users.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        email: dto.email,
        full_name: dto.fullName,
        phone: dto.phone || null,
        role_id: roleIdVal,
        status: 'ACTIVE',
        avatar_url: dto.avatarUrl || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Tạo JWT AccessToken trả về luôn để Frontend có thể auto-login sau khi đăng ký
    const payload = {
      sub: newUser.id.toString(),
      username: newUser.username,
      email: newUser.email,
      roleId: newUser.role_id.toString(),
      fullName: newUser.full_name,
    };

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      accessToken: this.jwtService.sign(payload),
      user: {
        id: newUser.id.toString(),
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        roleId: newUser.role_id.toString(),
        phone: newUser.phone,
        avatar: newUser.avatar_url,
      },
    };
  }

  // 2. Kiểm tra username và mật khẩu SHA-256 (Login validate)
  async validateUser(username: string, pass: string) {
    const user = await this.prisma.users.findUnique({
      where: { username: username },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không chính xác!',
      );
    }

    // Mã hoá mật khẩu người dùng gõ vào bằng chuẩn SHA-256
    const hashedInput = crypto
      .createHash('sha256')
      .update(pass)
      .digest('hex')
      .toLowerCase();

    // So sánh với chuỗi SHA2(..., 256) đang lưu trong cột password
    const storedHash = (user.password || '').toLowerCase();

    if (hashedInput !== storedHash) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không chính xác!',
      );
    }

    return user;
  }

  // 3. Tạo JWT Access Token (Login)
  async login(username: string, pass: string) {
    const user = await this.validateUser(username, pass);

    const payload = {
      sub: user.id.toString(),
      username: user.username,
      email: user.email,
      roleId: user.role_id.toString(),
      fullName: user.full_name,
    };

    return {
      success: true,
      message: 'Đăng nhập thành công!',
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roleId: user.role_id.toString(),
        avatar: user.avatar_url,
      },
    };
  }

  // 4. Đăng nhập bằng Google OAuth2 (Google Login)
  async googleLogin(dto: GoogleLoginDto) {
    let user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    let isNewUser = false;

    // Nếu người dùng chưa tồn tại trong hệ thống, tự động tạo mới (role_id = 3 Bệnh nhân)
    if (!user) {
      isNewUser = true;

      // Tạo username duy nhất từ email (VD: nguyenvana -> nếu trùng thêm _gg_ramdom)
      const emailPrefix = dto.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let usernameCandidate = emailPrefix;
      let counter = 1;
      while (
        await this.prisma.users.findUnique({
          where: { username: usernameCandidate },
        })
      ) {
        usernameCandidate = `${emailPrefix}_${counter}`;
        counter++;
      }

      // Tạo mật khẩu ngẫu nhiên rồi mã hóa SHA-256
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto
        .createHash('sha256')
        .update(randomPassword)
        .digest('hex')
        .toLowerCase();

      user = await this.prisma.users.create({
        data: {
          username: usernameCandidate,
          password: hashedPassword,
          email: dto.email,
          full_name: dto.fullName || emailPrefix,
          role_id: BigInt(3), // Mặc định là Bệnh nhân
          status: 'ACTIVE',
          avatar_url: dto.avatarUrl || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else if (dto.avatarUrl && !user.avatar_url) {
      // Cập nhật avatar nếu trước đó chưa có
      user = await this.prisma.users.update({
        where: { id: user.id },
        data: {
          avatar_url: dto.avatarUrl,
          updated_at: new Date(),
        },
      });
    }

    const payload = {
      sub: user.id.toString(),
      username: user.username,
      email: user.email,
      roleId: user.role_id.toString(),
      fullName: user.full_name,
    };

    return {
      success: true,
      message: 'Đăng nhập Google thành công!',
      isNewUser,
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roleId: user.role_id.toString(),
        avatar: user.avatar_url,
      },
    };
  }

  // Lấy địa chỉ email thật của tài khoản (theo username hoặc email) để tự động điền vào Modal
  async getEmailByAccount(account: string) {
    if (!account || !account.trim()) {
      return { success: false, email: '' };
    }
    const query = account.trim();
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: query }, { username: query }],
      },
    });

    if (!user || !user.email) {
      return { success: false, email: '' };
    }

    return {
      success: true,
      email: user.email,
      username: user.username,
    };
  }

  // 5. Gửi mã OTP khôi phục mật khẩu qua Gmail (kèm Redis Rate Limit)
  async sendForgotOtp(dto: SendForgotOtpDto) {
    const query = dto.email.trim();
    const user = await this.prisma.users.findFirst({
      where: {
         OR: [{ email: query }, { username: query }],
      },
    });

    if (!user || !user.email) {
      throw new BadRequestException(
        'Không tìm thấy tài khoản hợp lệ với Email hoặc Username này trong hệ thống!',
      );
    }

    // Kiểm tra Rate Limit trong Redis (Tối đa 5 lần / 15 phút)
    const rateKey = `rate_limit:forgot_pwd:${user.email}`;
    const tries = await this.redisService.incr(rateKey, 900);
    if (tries > 5) {
      throw new BadRequestException(
        'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng thử lại sau 15 phút!',
      );
    }

    // Sinh mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:forgot_pwd:${user.email}`;

    // Lưu OTP vào Redis với TTL 300 giây (5 phút)
    await this.redisService.set(otpKey, otpCode, 300);

    // Gửi email qua Gmail SMTP
    await this.emailService.sendForgotPwdOtpEmail(
      user.email,
      user.full_name,
      otpCode,
    );

    // Ẩn một phần email để phản hồi bảo mật cho người dùng (VD: n***@gmail.com)
    const [namePart, domainPart] = user.email.split('@');
    const maskedEmail =
      namePart.length > 2
        ? `${namePart.substring(0, 2)}***@${domainPart}`
        : `${namePart}***@${domainPart}`;

    return {
      success: true,
      message: `Mã xác thực OTP đã được gửi về Gmail (${maskedEmail}). Mã có hiệu lực trong 5 phút.`,
      email: user.email,
    };
  }

  // 6. Xác thực mã OTP trong Redis -> Trả về Reset Token
  async verifyForgotOtp(dto: VerifyForgotOtpDto) {
    const query = dto.email.trim();
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: query }, { username: query }],
      },
    });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại!');
    }

    const otpKey = `otp:forgot_pwd:${user.email}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp || storedOtp !== dto.otp.trim()) {
      throw new BadRequestException(
        'Mã xác thực OTP không chính xác hoặc đã hết hạn (5 phút)!',
      );
    }

    // Tạo Reset Token ngẫu nhiên (UUID) có hiệu lực 10 phút
    const resetToken = crypto.randomUUID();
    const tokenKey = `reset_token:${user.email}`;
    await this.redisService.set(tokenKey, resetToken, 600);

    // Xóa OTP khỏi Redis sau khi xác thực thành công để không bị dùng lại
    await this.redisService.del(otpKey);

    return {
      success: true,
      message: 'Xác thực OTP thành công! Bạn có thể đặt lại mật khẩu mới.',
      resetToken,
      email: user.email,
    };
  }

  // 7. Đặt lại mật khẩu mới
  async resetPassword(dto: ResetPasswordDto) {
    const query = dto.email.trim();
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: query }, { username: query }],
      },
    });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại!');
    }

    const tokenKey = `reset_token:${user.email}`;
    const storedToken = await this.redisService.get(tokenKey);

    if (!storedToken || storedToken !== dto.resetToken.trim()) {
      throw new BadRequestException(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (10 phút)! Vui lòng lấy lại mã OTP.',
      );
    }

    // Mã hoá mật khẩu mới theo chuẩn SHA-256 (khớp với SHA2(pass, 256) của MySQL)
    const hashedPassword = crypto
      .createHash('sha256')
      .update(dto.newPassword)
      .digest('hex')
      .toLowerCase();

    // Cập nhật mật khẩu mới vào database
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
      },
    });

    // Xóa reset token khỏi Redis
    await this.redisService.del(tokenKey);

    return {
      success: true,
      message:
        'Đặt lại mật khẩu y tế mới thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
    };
  }
}
