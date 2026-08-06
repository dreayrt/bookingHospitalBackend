import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const user = (
      process.env.GMAIL_USER ||
      process.env.GMAIL_USERNAME ||
      process.env.SMTP_USER
    )?.trim();
    const rawPass =
      process.env.GMAIL_PASS ||
      process.env.GMAIL_APP_PASSWORD ||
      process.env.SMTP_PASS;
    const pass = rawPass?.replace(/\s+/g, '');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: user,
          pass: pass,
        },
      });
      this.logger.log(`✅ [EmailService] Đã khởi tạo Gmail SMTP cho [${user}]`);
    } else {
      this.logger.warn(
        '⚠️ [EmailService] Chưa cấu hình GMAIL_USER/GMAIL_PASS trong .env. Chế độ DEV: Mã OTP sẽ hiển thị trên Console Backend.',
      );
    }
  }

  /**
   * Gửi mã OTP khôi phục mật khẩu qua Gmail
   */
  async sendForgotPwdOtpEmail(
    toEmail: string,
    fullName: string,
    otpCode: string,
  ): Promise<boolean> {
    const subject = `[Aura Health] Mã xác thực OTP khôi phục mật khẩu y tế (${otpCode})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f7f9; margin: 0; padding: 20px; }
          .email-wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 150, 170, 0.1); border: 1px solid #e0f2f1; }
          .email-header { background: linear-gradient(135deg, #00838f 0%, #00acc1 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
          .email-header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .email-header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
          .email-body { padding: 35px 30px; color: #2d3748; line-height: 1.6; }
          .email-body h2 { color: #00838f; font-size: 18px; margin-top: 0; }
          .otp-box { background: #e0f7fa; border: 2px dashed #00bcd4; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 36px; font-weight: 800; color: #006064; letter-spacing: 8px; margin: 0; }
          .otp-timer { font-size: 13px; color: #00838f; margin-top: 8px; font-weight: 600; }
          .warning-text { font-size: 13px; color: #d32f2f; background: #ffebee; padding: 12px; border-radius: 8px; margin-top: 20px; }
          .email-footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>CỔNG Y TẾ ĐA KHOA QUỐC TẾ AURA</h1>
            <p>Hệ thống Quản lý Hồ sơ Bệnh án EMR 4.0</p>
          </div>
          <div class="email-body">
            <h2>Xin chào ${fullName || 'Quý khách'},</h2>
            <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu truy cập hệ thống y tế cho tài khoản của bạn.</p>
            <p>Dưới đây là mã xác thực OTP của bạn:</p>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <div class="otp-timer">⏱️ Mã có hiệu lực trong vòng 05 PHÚT</div>
            </div>

            <p>Vui lòng nhập mã này trên màn hình xác thực để tiến hành đặt lại mật khẩu mới.</p>

            <div class="warning-text">
              <strong>⚠️ Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai, kể cả nhân viên bệnh viện hay kỹ thuật viên IT.
            </div>
          </div>
          <div class="email-footer">
            <p>© 2026 Aura Health - Bệnh viện Đa khoa Quốc tế. All rights reserved.</p>
            <p>Đây là email tự động, vui lòng không phản hồi lại email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: '"Aura Health Medical EMR" <no-reply@aurahealth.vn>',
          to: toEmail,
          subject: subject,
          html: htmlContent,
        });
        this.logger.log(`✅ [EmailService] Đã gửi OTP tới email [${toEmail}]`);
        return true;
      } catch (err) {
        this.logger.error(`❌ Lỗi gửi email tới [${toEmail}]: ${err.message}`);
        this.logger.warn(`🚀 [DEV MODE OPTION] Mã OTP cho [${toEmail}]: ===> [ ${otpCode} ] <===`);
        return false;
      }
    } else {
      this.logger.warn(
        `🚀 [DEV MODE OPTION] Mã OTP cho [${toEmail}]: ===> [ ${otpCode} ] <=== (Mã có hiệu lực 5 phút)`,
      );
      return true;
    }
  }

  /**
   * Gửi email xác nhận đặt lịch khám & thanh toán thành công
   */
  async sendBookingSuccessEmail(
    toEmail: string,
    fullName: string,
    bookingDetails: {
      appointmentId: string;
      doctorName: string;
      date: string;
      time: string;
      invoiceCode: string;
      amount: string;
    },
  ): Promise<boolean> {
    const subject = `[Aura Health] Xác nhận đặt lịch khám thành công (${bookingDetails.invoiceCode})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f7f9; margin: 0; padding: 20px; }
          .email-wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 150, 170, 0.1); border: 1px solid #e0f2f1; }
          .email-header { background: linear-gradient(135deg, #00838f 0%, #00acc1 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
          .email-header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .email-header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
          .email-body { padding: 35px 30px; color: #2d3748; line-height: 1.6; }
          .email-body h2 { color: #00838f; font-size: 18px; margin-top: 0; border-bottom: 2px solid #e0f2f1; padding-bottom: 10px; }
          
          .info-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          .info-table td { padding: 12px 15px; border-bottom: 1px solid #edf2f7; }
          .info-table td.label { font-weight: 600; color: #4a5568; width: 35%; }
          .info-table td.value { color: #1a202c; font-weight: 500; }
          
          .success-badge { display: inline-block; background-color: #e6fffa; color: #00838f; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; border: 1px solid #b2f5ea; margin-bottom: 20px; }
          .note-box { background: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 14px; }
          .note-box strong { color: #dd6b20; }
          
          .email-footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>CỔNG Y TẾ ĐA KHOA QUỐC TẾ AURA</h1>
            <p>Hệ thống Quản lý Đặt lịch Khám bệnh Trực tuyến</p>
          </div>
          <div class="email-body">
            <span class="success-badge">🎉 ĐẶT LỊCH & THANH TOÁN THÀNH CÔNG</span>
            <h2>Xin chào ${fullName || 'Quý khách'},</h2>
            <p>Cảm ơn bạn đã tin tưởng dịch vụ chăm sóc sức khỏe của Aura Health. Chúng tôi xin xác nhận lịch hẹn khám của bạn đã được đăng ký và thanh toán thành công.</p>
            
            <table class="info-table">
              <tr>
                <td class="label">Mã hóa đơn:</td>
                <td class="value" style="color: #00838f; font-weight: bold;">${bookingDetails.invoiceCode}</td>
              </tr>
              <tr>
                <td class="label">Bác sĩ phụ trách:</td>
                <td class="value">${bookingDetails.doctorName}</td>
              </tr>
              <tr>
                <td class="label">Ngày khám:</td>
                <td class="value">${bookingDetails.date}</td>
              </tr>
              <tr>
                <td class="label">Giờ khám:</td>
                <td class="value">${bookingDetails.time}</td>
              </tr>
              <tr>
                <td class="label">Số tiền thanh toán:</td>
                <td class="value" style="color: #2f855a; font-weight: bold;">${bookingDetails.amount}</td>
              </tr>
              <tr>
                <td class="label">Mã cuộc hẹn:</td>
                <td class="value">#${bookingDetails.appointmentId}</td>
              </tr>
            </table>

            <div class="note-box">
              <strong>⚠️ Lưu ý khi đi khám:</strong>
              <ul style="margin: 5px 0 0 20px; padding: 0;">
                <li>Vui lòng có mặt tại quầy đón tiếp trước giờ hẹn ít nhất 15 phút để làm thủ tục.</li>
                <li>Mang theo thẻ BHYT (nếu có) và căn cước công dân.</li>
                <li>Đưa mã hóa đơn <strong>${bookingDetails.invoiceCode}</strong> này cho nhân viên lễ tân khi check-in để được hướng dẫn vào phòng khám nhanh nhất.</li>
              </ul>
            </div>
          </div>
          <div class="email-footer">
            <p>© 2026 Aura Health - Bệnh viện Đa khoa Quốc tế. All rights reserved.</p>
            <p>Mọi thắc mắc vui lòng liên hệ hotline 1900-XXXX để được hỗ trợ kịp thời.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: '"Aura Health" <no-reply@aurahealth.vn>',
          to: toEmail,
          subject: subject,
          html: htmlContent,
        });
        this.logger.log(`✅ [EmailService] Đã gửi xác nhận đặt lịch tới email [${toEmail}]`);
        return true;
      } catch (err) {
        this.logger.error(`❌ Lỗi gửi email tới [${toEmail}]: ${err.message}`);
        return false;
      }
    } else {
      this.logger.warn(
        `⚠️ [EmailService] Chưa được cấu hình SMTP. Không thể gửi email thực tế đến [${toEmail}].`,
      );
      return false;
    }
  }
}

