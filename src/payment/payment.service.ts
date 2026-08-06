import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
  ) {}

  getSepayConfig() {
    return {
      account: process.env.SEPAY_ACCOUNT || '',
      bank: process.env.SEPAY_BANK || 'MB',
      accountName: 'PHONG KHAM HMS',
    };
  }

  async getInvoiceStatus(invoiceCode: string) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { invoice_code: invoiceCode },
    });
    if (!invoice) {
      throw new NotFoundException('Hóa đơn không tồn tại!');
    }
    return {
      invoiceCode: invoice.invoice_code,
      status: invoice.status,
      amount: Number(invoice.total_amount),
    };
  }

  validateWebhookToken(token: string): boolean {
    const expectedToken = process.env.SEPAY_WEBHOOK_TOKEN || '';
    if (!expectedToken) return true; // Nếu chưa cấu hình token thì bỏ qua xác thực
    return token === expectedToken;
  }

  validateHmacSignature(payload: any, signature: string, timestamp: string): boolean {
    const secretKey = process.env.SEPAY_WEBHOOK_TOKEN || '';
    if (!secretKey) return true; // Nếu chưa cấu hình thì bỏ qua xác thực

    try {
      const crypto = require('crypto');
      // Chuyển payload về dạng chuỗi JSON thô để tính toán chữ ký
      const rawBody = JSON.stringify(payload);
      
      // Hỗ trợ cả 2 chuẩn ký: định dạng mới "{timestamp}.{body}" và định dạng chỉ ký body
      const messageWithTimestamp = timestamp ? `${timestamp}.${rawBody}` : rawBody;
      
      const expectedSignature1 = crypto
        .createHmac('sha256', secretKey)
        .update(messageWithTimestamp)
        .digest('hex');

      const expectedSignature2 = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('hex');

      const actualSignature = signature.replace('sha256=', '').trim();
      return actualSignature === expectedSignature1 || actualSignature === expectedSignature2;
    } catch (err) {
      return false;
    }
  }

  async processSepayWebhook(payload: any) {
    // Hỗ trợ tất cả các tên thuộc tính của Sepay (v1 & v2 webhook)
    const content = String(
      payload.transactionContent ||
      payload.content ||
      payload.description ||
      payload.message ||
      payload.transferContent ||
      payload.detail ||
      payload.note ||
      JSON.stringify(payload) ||
      ''
    );
    const transferAmount = Number(
      payload.transferAmount ||
      payload.amountIn ||
      payload.amount_in ||
      payload.amount ||
      payload.transfer_amount ||
      payload.value ||
      0
    );

    console.log('--- [SEPAY WEBHOOK RECEIVED] ---', {
      content,
      transferAmount,
      payload,
    });

    // Regex tìm mã hóa đơn PK hoặc HMS <id> (hỗ trợ cả dấu cách/gạch nối nếu người dùng nhập dính/rời)
    const match = content.match(/(PK|HMS)[\s-_]*(\d+)/i);
    if (!match) {
      return { success: false, message: 'Nội dung chuyển khoản không hợp lệ (thiếu mã thanh toán PK hoặc HMS)' };
    }

    const prefix = match[1].toUpperCase();
    const appointmentIdStr = match[2];
    const invoiceCode = `${prefix}${appointmentIdStr}`;

    let smsData: any = null;

    const result = await this.prisma.$transaction(async (tx) => {
      // Tìm hóa đơn
      const invoice = await tx.invoices.findFirst({
        where: {
          invoice_code: invoiceCode,
        },
      });

      if (!invoice) {
        return { success: false, message: `Không tìm thấy hóa đơn với mã ${invoiceCode}` };
      }

      if (invoice.status === 'PAID') {
        return { success: true, message: 'Hóa đơn đã được thanh toán từ trước' };
      }

      // Kiểm tra số tiền chuyển khoản (chỉ chặn khi có số tiền > 0 nhưng nhỏ hơn tổng hóa đơn)
      if (transferAmount > 0 && transferAmount < Number(invoice.total_amount)) {
        return { 
          success: false, 
          message: `Số tiền thanh toán ${transferAmount} nhỏ hơn giá trị hóa đơn ${invoice.total_amount}` 
        };
      }

      // 1. Cập nhật trạng thái hóa đơn -> PAID
      await tx.invoices.update({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });

      // 2. Tạo bản ghi payment mới
      await tx.payments.create({
        data: {
          invoice_id: invoice.id,
          payment_method: payload.gateway || 'Sepay QR',
          amount: transferAmount,
          transaction_code: payload.code || payload.referenceCode || `TXN-${Date.now()}`,
          status: 'SUCCESS',
        },
      });

      // 3. Cập nhật trạng thái cuộc hẹn tương ứng -> CONFIRMED
      if (invoice.appointment_id) {
        await tx.appointments.update({
          where: { id: invoice.appointment_id },
          data: { status: 'CONFIRMED' },
        });

        // Lấy thông tin để chuẩn bị gửi SMS
        try {
          const appt = await tx.appointments.findUnique({
            where: { id: invoice.appointment_id },
            include: {
              patients: {
                include: {
                  users: true,
                },
              },
              doctors: {
                include: {
                  users: true,
                },
              },
            },
          });

          if (appt && appt.patients?.users?.phone) {
            smsData = {
              phone: appt.patients.users.phone,
              fullName: appt.patients.users.full_name,
              appointmentId: appt.id.toString(),
              doctorName: appt.doctors?.users?.full_name || 'Bac si Aura Health',
              date: appt.appointment_date,
              time: appt.appointment_time,
              invoiceCode: invoice.invoice_code,
              amount: transferAmount || Number(invoice.total_amount),
            };
          }
        } catch (err) {
          console.error('Lỗi khi lấy thông tin lịch hẹn để chuẩn bị gửi SMS:', err);
        }
      }

      try {
        if (invoice.patient_id) {
          await this.notificationService.createNotification({
            title: '💰 Thanh toán phí khám VIP thành công!',
            message: `Hóa đơn ${invoiceCode} (${transferAmount.toLocaleString('vi-VN')} VNĐ) đã được thanh toán thành công qua SePay. Lịch khám đã xác nhận.`,
            role: 'patient',
            targetId: invoice.patient_id.toString(),
            type: 'PAYMENT_SUCCESS',
          });
        }
        await this.notificationService.createNotification({
          title: '💰 Bệnh nhân đã hoàn tất thanh toán!',
          message: `Hóa đơn ${invoiceCode} (${transferAmount.toLocaleString('vi-VN')} VNĐ) vừa được thanh toán thành công qua SePay Webhook. Lịch hẹn tự động xác nhận.`,
          role: 'doctor',
          type: 'PAYMENT_SUCCESS',
        });
      } catch (err) {
        // Ignore notif error
      }

      return {
        success: true,
        message: 'Xử lý thanh toán thành công và đã cập nhật lịch hẹn!',
      };
    });

    // Ngoài transaction: thực hiện gửi tin nhắn SMS bất đồng bộ
    if (result.success && smsData) {
      const dateStr = new Date(smsData.date).toLocaleDateString('vi-VN');
      let timeStr = '';
      try {
        const t = new Date(smsData.time);
        const hours = String(t.getHours()).padStart(2, '0');
        const minutes = String(t.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
      } catch (e) {
        timeStr = smsData.time?.toString() || '';
      }

      // Hàm chuyển chữ tiếng Việt có dấu thành không dấu để gửi SMS an toàn
      const removeTones = (str: string): string => {
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D');
      };

      const messageContent = removeTones(
        `Xac nhan lich kham cua BN ${smsData.fullName} luc ${timeStr} ngay ${dateStr} da duoc thanh toan thanh cong. Ma HD: ${smsData.invoiceCode}. Vui long den truoc 15 phut.`,
      );

      this.smsService.sendSms(smsData.phone, messageContent).catch(err => {
        console.error('Lỗi khi gửi SMS xác nhận lịch khám:', err);
      });
    }

    return result;
  }
}

