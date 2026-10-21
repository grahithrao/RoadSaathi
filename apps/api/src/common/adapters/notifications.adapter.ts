import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationChannel } from '@prisma/client';

export interface SendNotificationInput {
  recipientPhone?: string;
  recipientEmail?: string;
  recipientUserId?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  payload?: Record<string, any>;
}

@Injectable()
export class NotificationsAdapter {
  private readonly logger = new Logger(NotificationsAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enqueues and records a notification job in the durable ledger
   */
  async sendNotification(input: SendNotificationInput): Promise<string> {
    const job = await this.prisma.notificationJob.create({
      data: {
        recipientPhone: input.recipientPhone,
        recipientEmail: input.recipientEmail,
        recipientUserId: input.recipientUserId,
        channel: input.channel,
        title: input.title,
        body: input.body,
        payloadJson: input.payload ?? {},
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(`[NOTIF] Dispatched ${input.channel} to ${input.recipientPhone || input.recipientEmail || input.recipientUserId}: "${input.title} - ${input.body}"`);

    return job.id;
  }
}
