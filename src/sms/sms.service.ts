import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Định dạng lại số điện thoại về dạng bắt đầu bằng số 0 (0xxxxxxxxx) cho eSMS.vn
   */
  private formatPhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, ''); // Loại bỏ các ký tự không phải số
    if (clean.startsWith('84')) {
      clean = '0' + clean.slice(2);
    }
    return clean;
  }

  /**
   * Gửi tin nhắn SMS thật qua API eSMS.vn (SendMultipleMessage_V4_post_json)
   */
  async sendSms(toPhone: string, message: string): Promise<boolean> {
    const apiKey = process.env.ESMS_API_KEY;
    const secretKey = process.env.ESMS_SECRET_KEY;
    const brandname = process.env.ESMS_BRANDNAME || '';
    const formattedPhone = this.formatPhoneNumber(toPhone);

    if (!apiKey || !secretKey) {
      this.logger.error('❌ [SmsService] ESMS_API_KEY hoặc ESMS_SECRET_KEY chưa được cấu hình trong file .env');
      return false;
    }

    try {
      const isBrandnameEmpty = !brandname || brandname.trim() === '';
      const smsType = isBrandnameEmpty ? 8 : 2; // 8: Đầu số cố định 10 số (không cần brandname), 2: CSKH có Brandname

      const response = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ApiKey: apiKey,
          SecretKey: secretKey,
          Phone: formattedPhone,
          Content: message,
          SmsType: smsType,
          Brandname: isBrandnameEmpty ? '' : brandname,
          Sandbox: 0, // 0: Chạy thật, 1: Chế độ sandbox (thử nghiệm)
          IsUnicode: 0, // 0: Tin nhắn không dấu, 1: Tin nhắn có dấu
        }),
      });

      const resData = await response.json();
      
      // eSMS.vn trả về CodeResult: "100" nếu gửi tin nhắn thành công
      if (resData && resData.CodeResult === '100') {
        this.logger.log(`✅ [SmsService] Đã gửi SMS eSMS thành công tới [${toPhone}] (${formattedPhone}), SMSID: ${resData.SMSID}`);
        return true;
      } else {
        this.logger.error(`❌ [SmsService] eSMS.vn báo lỗi (Code ${resData?.CodeResult}): ${resData?.ErrorMessage || JSON.stringify(resData)}`);
        return false;
      }
    } catch (err) {
      this.logger.error(`❌ [SmsService] Lỗi kết nối API eSMS.vn: ${err.message}`);
      return false;
    }
  }
}
