import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PaymentsAdapter } from '../../common/adapters/payments.adapter.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import {
  PaymentStatus,
  PaymentMethod,
  BookingStatus,
  CashReconciliationStatus,
  NotificationChannel,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsAdapter: PaymentsAdapter,
    private readonly ledgerService: LedgerService,
    private readonly notifications: NotificationsAdapter
  ) {}

  /**
   * Creates an online payment order with Razorpay
   */
  async createPaymentOrder(bookingId: string, customerUserId: string, method: PaymentMethod) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customerProfile: true,
        quotes: {
          where: { status: 'ACCEPTED' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking || booking.customerProfile.userId !== customerUserId) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    // Determine authoritative payable amount:
    // If an approved quote exists, payable = quote.netPayablePaise
    // Otherwise payable = booking.totalEstimatedVisitFeePaise
    let amountPaise = booking.totalEstimatedVisitFeePaise;
    let laborAndVisitPaise = booking.acceptedVisitFeePaise;

    if (booking.quotes.length > 0) {
      const quote = booking.quotes[0];
      amountPaise = quote.netPayablePaise;
      laborAndVisitPaise = quote.laborSubtotalPaise + booking.acceptedVisitFeePaise;
    }

    // Create Razorpay order
    const orderResult = await this.paymentsAdapter.createOrder(
      amountPaise,
      booking.bookingNumber,
      {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        customerUserId,
      }
    );

    // Save payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amountPaise,
        currency: 'INR',
        status: PaymentStatus.PENDING,
        paymentMethod: method,
        razorpayOrderId: orderResult.orderId,
      },
    });

    return {
      paymentId: payment.id,
      orderId: orderResult.orderId,
      amountPaise,
      currency: 'INR',
      keyId: orderResult.keyId,
      isSimulated: orderResult.isSimulated,
    };
  }

  /**
   * Verifies Razorpay payment signature and completes settlement
   */
  async verifyPaymentSignature(params: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const isValid = this.paymentsAdapter.verifyPaymentSignature(
      params.razorpayOrderId,
      params.razorpayPaymentId,
      params.razorpaySignature
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
      include: {
        booking: {
          include: {
            customerProfile: { include: { user: true } },
            quotes: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment order not found');
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      return { success: true, paymentId: payment.id, message: 'Already captured' };
    }

    // Mark payment captured
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        capturedAt: new Date(),
      },
    });

    // Record ledger double-entry settlement
    const laborAndVisitPaise = payment.booking.quotes.length > 0
      ? payment.booking.quotes[0].laborSubtotalPaise + payment.booking.acceptedVisitFeePaise
      : payment.booking.acceptedVisitFeePaise;

    await this.ledgerService.recordOnlinePaymentSettlement({
      bookingId: payment.bookingId,
      totalPaidPaise: payment.amountPaise,
      laborAndVisitPaise,
      paymentId: updatedPayment.id,
    });

    // Send receipt notification
    await this.notifications.sendNotification({
      recipientPhone: payment.booking.customerProfile.user.phone,
      channel: NotificationChannel.SMS,
      title: 'Payment Confirmed - RoadSaathi',
      body: `Payment of ₹${payment.amountPaise / 100} for ${payment.booking.bookingNumber} confirmed. Thank you for using RoadSaathi!`,
      payload: { bookingId: payment.bookingId, paymentId: updatedPayment.id },
    });

    return {
      success: true,
      paymentId: updatedPayment.id,
      amountPaise: payment.amountPaise,
    };
  }

  /**
   * Configurable Cash on Completion flow
   */
  async acknowledgeCash(params: {
    bookingId: string;
    amountPaise: number;
    actorRole: 'MECHANIC' | 'CUSTOMER';
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        payments: { where: { paymentMethod: PaymentMethod.CASH_ON_COMPLETION } },
        quotes: { where: { status: 'ACCEPTED' } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    let payment = booking.payments[0];

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId: params.bookingId,
          amountPaise: params.amountPaise,
          paymentMethod: PaymentMethod.CASH_ON_COMPLETION,
          status: PaymentStatus.PENDING,
          cashReconciliation: CashReconciliationStatus.PENDING_CONFIRMATION,
        },
      });
    }

    // If both mechanic & customer acknowledge, or mechanic marks collected and customer confirms:
    if (params.actorRole === 'MECHANIC') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cashReconciliation: CashReconciliationStatus.PENDING_CONFIRMATION,
          status: PaymentStatus.PENDING,
        },
      });
    } else if (params.actorRole === 'CUSTOMER') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cashReconciliation: CashReconciliationStatus.CONFIRMED,
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
        },
      });

      // Record cash commission receivable in ledger
      const laborAndVisitPaise = booking.quotes.length > 0
        ? booking.quotes[0].laborSubtotalPaise + booking.acceptedVisitFeePaise
        : booking.acceptedVisitFeePaise;

      await this.ledgerService.recordCashCollection({
        bookingId: booking.id,
        amountPaise: params.amountPaise,
        laborAndVisitPaise,
      });
    }

    return { success: true, paymentId: payment.id };
  }

  /**
   * Process Razorpay Raw Webhook
   */
  async processWebhook(rawBody: string | Buffer, signature: string) {
    const isValid = this.paymentsAdapter.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventId = payload.event_id || payload.id || crypto.randomUUID();

    // Check deduplication
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return { status: 'already_processed' };
    }

    await this.prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: payload.event,
        payloadJson: payload,
        signature,
        processed: true,
        processedAt: new Date(),
      },
    });

    this.logger.log(`[WEBHOOK] Processed Razorpay event: ${payload.event} (${eventId})`);

    return { status: 'success' };
  }
}
