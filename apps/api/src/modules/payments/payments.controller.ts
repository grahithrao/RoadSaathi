import { Controller, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaymentMethod } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser('userId') customerUserId: string,
    @Body() body: { bookingId: string; paymentMethod: PaymentMethod }
  ) {
    return this.paymentsService.createPaymentOrder(body.bookingId, customerUserId, body.paymentMethod);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifySignature(@Body() body: any) {
    return this.paymentsService.verifyPaymentSignature({
      bookingId: body.bookingId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });
  }

  @Post('cash/acknowledge')
  @UseGuards(JwtAuthGuard)
  async acknowledgeCash(@Body() body: any) {
    return this.paymentsService.acknowledgeCash({
      bookingId: body.bookingId,
      amountPaise: body.amountPaise,
      actorRole: body.actorRole,
    });
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any
  ) {
    // Unmodified raw body
    const rawBody = req.rawBody || JSON.stringify(req.body);
    return this.paymentsService.processWebhook(rawBody, signature || '');
  }
}
