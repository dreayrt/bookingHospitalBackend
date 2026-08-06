import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, HttpCode } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('sepay-config')
  getSepayConfig() {
    return this.paymentService.getSepayConfig();
  }

  @Get('invoice-status/:invoiceCode')
  async getInvoiceStatus(@Param('invoiceCode') invoiceCode: string) {
    return this.paymentService.getInvoiceStatus(invoiceCode);
  }

  @Post(['sepay-webhook', 'notify', 'webhook'])
  @HttpCode(200)
  async processSepayWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader?: string,
    @Headers('x-sepay-signature') signature?: string,
    @Headers('x-sepay-timestamp') timestamp?: string,
  ) {
    // 1. Xác thực bằng HMAC-SHA256 nếu SePay gửi kèm chữ ký (do bạn chọn HMAC-SHA256)
    if (signature) {
      if (!this.paymentService.validateHmacSignature(payload, signature, timestamp || '')) {
        throw new UnauthorizedException('Chữ ký HMAC-SHA256 không hợp lệ!');
      }
    }
    // 2. Xác thực bằng API Key truyền thống (nếu chọn API Key trên SePay)
    else if (authHeader) {
      const token = authHeader?.replace(/apikey\s+/i, '')?.trim() || '';
      if (!this.paymentService.validateWebhookToken(token)) {
        throw new UnauthorizedException('Token webhook không hợp lệ!');
      }
    }
    // 3. Nếu cấu hình token bảo mật nhưng không nhận được phương thức xác thực nào hợp lệ
    else if (process.env.SEPAY_WEBHOOK_TOKEN) {
      throw new UnauthorizedException('Thiếu chữ ký xác thực Webhook từ SePay!');
    }

    return this.paymentService.processSepayWebhook(payload);
  }
}
