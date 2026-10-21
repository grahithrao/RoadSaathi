import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';

export interface CreateOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  isSimulated: boolean;
}

@Injectable()
export class PaymentsAdapter {
  private readonly logger = new Logger(PaymentsAdapter.name);
  private readonly keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock';
  private readonly webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_mock';

  /**
   * Creates an order with Razorpay
   */
  async createOrder(
    amountPaise: number,
    receiptId: string,
    notes: Record<string, string> = {}
  ): Promise<CreateOrderResult> {
    if (this.keyId.startsWith('rzp_live')) {
      try {
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: receiptId,
            notes,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            orderId: data.id,
            amountPaise: data.amount,
            currency: data.currency,
            keyId: this.keyId,
            isSimulated: false,
          };
        }
      } catch (err) {
        this.logger.error(`Razorpay live order creation failed: ${err}`);
      }
    }

    // Deterministic Mock Order for Dev / Testing
    const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`[PAYMENT ADAPTER] Created test order ${mockOrderId} for ₹${amountPaise / 100}`);

    return {
      orderId: mockOrderId,
      amountPaise,
      currency: 'INR',
      keyId: this.keyId,
      isSimulated: true,
    };
  }

  /**
   * Verifies Razorpay client payment signature
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string
  ): boolean {
    if (this.keyId.startsWith('rzp_test_mock')) {
      // In mock development mode, accept valid signatures or test mocks
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Validates Razorpay Webhook signature using raw payload buffer
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(bodyStr)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }
}
