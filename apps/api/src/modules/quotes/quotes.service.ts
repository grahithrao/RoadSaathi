import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { QuoteStatus, BookingStatus, UserRole, NotificationChannel } from '@prisma/client';
import { calculateQuoteBreakdown, QuoteItemInput } from '@roadsaathi/contracts';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsAdapter
  ) {}

  /**
   * Mechanic creates an itemized quote after diagnosing vehicle
   */
  async createQuote(params: {
    bookingId: string;
    mechanicUserId: string;
    items: QuoteItemInput[];
    notes?: string;
    validUntilMinutes?: number;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        mechanicProfile: true,
        customerProfile: { include: { user: true } },
        quotes: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!booking || booking.mechanicProfile?.userId !== params.mechanicUserId) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    if (booking.status !== BookingStatus.DIAGNOSING && booking.status !== BookingStatus.AWAITING_QUOTE_APPROVAL) {
      throw new BadRequestException(`Cannot create quote in booking status: ${booking.status}`);
    }

    // Determine version number
    const nextVersion = booking.quotes.length > 0 ? booking.quotes[0].version + 1 : 1;

    // Calculate itemized totals in integer paise
    const breakdown = calculateQuoteBreakdown({
      items: params.items,
      alreadyPaidVisitFeePaise: booking.acceptedVisitFeePaise,
      creditDiagnosisFee: true, // Transparent credit of diagnosis fee
    });

    const validDuration = params.validUntilMinutes || 15;
    const validUntil = new Date(Date.now() + validDuration * 60 * 1000);

    const quote = await this.prisma.$transaction(async (tx) => {
      // If previous quote was presented, mark it expired
      await tx.quote.updateMany({
        where: {
          bookingId: params.bookingId,
          status: QuoteStatus.PRESENTED,
        },
        data: { status: QuoteStatus.EXPIRED },
      });

      const q = await tx.quote.create({
        data: {
          bookingId: params.bookingId,
          version: nextVersion,
          status: QuoteStatus.PRESENTED,
          laborSubtotalPaise: breakdown.laborSubtotalPaise,
          partsSubtotalPaise: breakdown.partsSubtotalPaise,
          grossSubtotalPaise: breakdown.grossSubtotalPaise,
          diagnosisCreditPaise: breakdown.diagnosisCreditPaise,
          taxableAmountPaise: breakdown.taxableAmountPaise,
          taxPaise: breakdown.taxPaise,
          netPayablePaise: breakdown.netPayablePaise,
          notes: params.notes,
          validUntil,
          items: {
            create: breakdown.items.map((item) => ({
              type: item.type,
              description: item.description,
              quantity: item.quantity,
              unitPricePaise: item.unitPricePaise,
              totalPaise: item.totalPaise,
            })),
          },
        },
        include: { items: true },
      });

      // Update booking status to AWAITING_QUOTE_APPROVAL
      await tx.booking.update({
        where: { id: params.bookingId },
        data: {
          status: BookingStatus.AWAITING_QUOTE_APPROVAL,
          version: { increment: 1 },
        },
      });

      // Append audit event
      await tx.bookingEvent.create({
        data: {
          bookingId: params.bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.AWAITING_QUOTE_APPROVAL,
          actorId: params.mechanicUserId,
          actorRole: UserRole.MECHANIC,
          reason: `Itemized quote v${nextVersion} presented: ₹${breakdown.netPayablePaise / 100}`,
        },
      });

      return q;
    });

    // Notify customer
    await this.notifications.sendNotification({
      recipientPhone: booking.customerProfile.user.phone,
      channel: NotificationChannel.SMS,
      title: 'Repair Quote Received - RoadSaathi',
      body: `Your mechanic has submitted a repair quote for ₹${breakdown.netPayablePaise / 100}. Review itemized parts & labor in the app.`,
      payload: { bookingId: params.bookingId, quoteId: quote.id },
    });

    return quote;
  }

  /**
   * Customer approves or rejects exact version of repair quote
   */
  async decideQuote(params: {
    quoteId: string;
    version: number;
    decision: 'ACCEPT' | 'REJECT';
    customerUserId: string;
    rejectionReason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id: params.quoteId },
        include: {
          booking: {
            include: { customerProfile: true },
          },
        },
      });

      if (!quote || quote.booking.customerProfile.userId !== params.customerUserId) {
        throw new ForbiddenException('Not authorized to decide this quote');
      }

      if (quote.version !== params.version) {
        throw new BadRequestException('Quote version mismatch. Please review the latest quote.');
      }

      if (quote.status !== QuoteStatus.PRESENTED) {
        throw new BadRequestException(`Quote is already resolved: ${quote.status}`);
      }

      if (new Date() > quote.validUntil) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: QuoteStatus.EXPIRED },
        });
        throw new BadRequestException('This quote has expired. Please ask the mechanic for a refreshed quote.');
      }

      if (params.decision === 'ACCEPT') {
        const approved = await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: QuoteStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });

        // Record immutable approval record
        await tx.quoteApproval.create({
          data: {
            quoteId: quote.id,
            customerProfileId: quote.booking.customerProfileId,
            approvedVersion: quote.version,
            approvedAmountPaise: quote.netPayablePaise,
          },
        });

        // Transition booking to IN_PROGRESS
        await tx.booking.update({
          where: { id: quote.bookingId },
          data: {
            status: BookingStatus.IN_PROGRESS,
            version: { increment: 1 },
          },
        });

        await tx.bookingEvent.create({
          data: {
            bookingId: quote.bookingId,
            fromStatus: BookingStatus.AWAITING_QUOTE_APPROVAL,
            toStatus: BookingStatus.IN_PROGRESS,
            actorId: params.customerUserId,
            actorRole: UserRole.CUSTOMER,
            reason: `Customer approved quote v${quote.version} for ₹${quote.netPayablePaise / 100}`,
          },
        });

        return { quote: approved, bookingStatus: BookingStatus.IN_PROGRESS };
      } else {
        // REJECT quote
        const rejected = await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: QuoteStatus.REJECTED,
            respondedAt: new Date(),
            rejectionReason: params.rejectionReason || 'Customer rejected quote',
          },
        });

        // Transition booking to COMPLETION_PENDING (diagnosis-only completion without repair)
        await tx.booking.update({
          where: { id: quote.bookingId },
          data: {
            status: BookingStatus.COMPLETION_PENDING,
            version: { increment: 1 },
          },
        });

        await tx.bookingEvent.create({
          data: {
            bookingId: quote.bookingId,
            fromStatus: BookingStatus.AWAITING_QUOTE_APPROVAL,
            toStatus: BookingStatus.COMPLETION_PENDING,
            actorId: params.customerUserId,
            actorRole: UserRole.CUSTOMER,
            reason: `Customer rejected quote. Diagnosis-only completion: ${params.rejectionReason || 'None'}`,
          },
        });

        return { quote: rejected, bookingStatus: BookingStatus.COMPLETION_PENDING };
      }
    });
  }
}
