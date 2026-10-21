import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { LedgerEntryType, PaymentMethod } from '@prisma/client';
import { calculateCommission } from '@roadsaathi/contracts';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records ledger entries for online completed service
   */
  async recordOnlinePaymentSettlement(params: {
    bookingId: string;
    totalPaidPaise: number;
    laborAndVisitPaise: number;
    paymentId: string;
    commissionPercent?: number;
  }) {
    const commission = calculateCommission({
      totalPaidPaise: params.totalPaidPaise,
      laborAndVisitPaise: params.laborAndVisitPaise,
      commissionPercent: params.commissionPercent,
    });

    const entries = await this.prisma.$transaction([
      // 1. Credit Customer Payment into Platform Escrow
      this.prisma.ledgerEntry.create({
        data: {
          bookingId: params.bookingId,
          entryType: LedgerEntryType.CUSTOMER_PAYMENT,
          creditPaise: params.totalPaidPaise,
          accountType: 'ESCROW',
          description: `Customer payment received via Razorpay: ₹${params.totalPaidPaise / 100}`,
          referenceId: params.paymentId,
        },
      }),

      // 2. Platform Commission Earned
      this.prisma.ledgerEntry.create({
        data: {
          bookingId: params.bookingId,
          entryType: LedgerEntryType.PLATFORM_COMMISSION,
          creditPaise: commission.platformCommissionPaise,
          accountType: 'PLATFORM',
          description: `Platform commission (${params.commissionPercent || 15}% on service/visit): ₹${commission.platformCommissionPaise / 100}`,
          referenceId: params.paymentId,
        },
      }),

      // 3. Mechanic Net Earning Payable
      this.prisma.ledgerEntry.create({
        data: {
          bookingId: params.bookingId,
          entryType: LedgerEntryType.MECHANIC_EARNING,
          creditPaise: commission.mechanicNetEarningsPaise,
          accountType: 'MECHANIC',
          description: `Mechanic net earning payable after commission: ₹${commission.mechanicNetEarningsPaise / 100}`,
          referenceId: params.paymentId,
        },
      }),
    ]);

    this.logger.log(`[LEDGER] Recorded online settlement for booking ${params.bookingId}: Gross ₹${params.totalPaidPaise / 100}, Commission ₹${commission.platformCommissionPaise / 100}, Net ₹${commission.mechanicNetEarningsPaise / 100}`);

    return { entries, commission };
  }

  /**
   * Records cash collection: Mechanic collected physical cash,
   * so mechanic owes platform commission (recorded as CASH_COMMISSION_RECEIVABLE)
   */
  async recordCashCollection(params: {
    bookingId: string;
    amountPaise: number;
    laborAndVisitPaise: number;
    commissionPercent?: number;
  }) {
    const commission = calculateCommission({
      totalPaidPaise: params.amountPaise,
      laborAndVisitPaise: params.laborAndVisitPaise,
      commissionPercent: params.commissionPercent,
    });

    // For cash: Platform did NOT collect money through gateway.
    // Mechanic already holds 100% of the cash.
    // We debit the mechanic's platform commission account so it reconciles on next payout.
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        bookingId: params.bookingId,
        entryType: LedgerEntryType.CASH_COMMISSION_RECEIVABLE,
        debitPaise: commission.platformCommissionPaise,
        accountType: 'MECHANIC',
        description: `Cash commission receivable from mechanic for booking ${params.bookingId}: ₹${commission.platformCommissionPaise / 100}`,
        referenceId: params.bookingId,
      },
    });

    this.logger.log(`[LEDGER] Recorded cash commission receivable for booking ${params.bookingId}: ₹${commission.platformCommissionPaise / 100}`);

    return { entry, commission };
  }

  /**
   * Calculates financial statement for mechanic
   */
  async getMechanicFinancialSummary(mechanicProfileId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        mechanicProfileId,
        status: 'COMPLETED',
      },
      include: {
        payments: true,
        ledgerEntries: true,
      },
    });

    let grossEarningsPaise = 0;
    let platformCommissionPaise = 0;
    let netPayableEarningsPaise = 0;
    let cashCommissionDebtPaise = 0;

    for (const b of bookings) {
      for (const entry of b.ledgerEntries) {
        if (entry.entryType === LedgerEntryType.MECHANIC_EARNING) {
          netPayableEarningsPaise += entry.creditPaise;
        } else if (entry.entryType === LedgerEntryType.PLATFORM_COMMISSION) {
          platformCommissionPaise += entry.creditPaise;
        } else if (entry.entryType === LedgerEntryType.CASH_COMMISSION_RECEIVABLE) {
          cashCommissionDebtPaise += entry.debitPaise;
        }
      }

      for (const p of b.payments) {
        if (p.status === 'CAPTURED') {
          grossEarningsPaise += p.amountPaise;
        }
      }
    }

    return {
      totalCompletedJobs: bookings.length,
      grossEarningsPaise,
      platformCommissionPaise,
      netPayableEarningsPaise,
      cashCommissionDebtPaise,
      netSettlementBalancePaise: Math.max(0, netPayableEarningsPaise - cashCommissionDebtPaise),
    };
  }

  async listLedgerEntries(limit = 100) {
    return this.prisma.ledgerEntry.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            customerProfile: { include: { user: true } },
            mechanicProfile: true,
          },
        },
      },
    });
  }
}
