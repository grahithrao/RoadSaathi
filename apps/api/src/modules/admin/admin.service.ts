import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import {
  VerificationStatus,
  BookingStatus,
  UserRole,
  NotificationChannel,
} from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsAdapter
  ) {}

  /**
   * List pending provider verifications with submitted documents
   */
  async listPendingVerifications() {
    return this.prisma.mechanicProfile.findMany({
      where: {
        verificationStatus: {
          in: [VerificationStatus.SUBMITTED, VerificationStatus.UNDER_REVIEW, VerificationStatus.CHANGES_REQUESTED],
        },
      },
      include: {
        user: true,
        documents: true,
        services: { include: { serviceCategory: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Admin reviews provider verification with required reason
   */
  async reviewVerification(params: {
    mechanicProfileId: string;
    reviewerUserId: string;
    reviewerRole: UserRole;
    status: VerificationStatus;
    reasonNotes: string;
  }) {
    const mechanic = await this.prisma.mechanicProfile.findUnique({
      where: { id: params.mechanicProfileId },
      include: { user: true },
    });

    if (!mechanic) {
      throw new NotFoundException('Mechanic profile not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const m = await tx.mechanicProfile.update({
        where: { id: params.mechanicProfileId },
        data: {
          verificationStatus: params.status,
          // If approved, verify documents
          documents: params.status === VerificationStatus.APPROVED ? {
            updateMany: {
              where: { verifiedAt: null },
              data: { verifiedAt: new Date() },
            },
          } : undefined,
        },
      });

      // Record audit submission log
      await tx.verificationSubmission.create({
        data: {
          mechanicProfileId: params.mechanicProfileId,
          status: params.status,
          reviewerId: params.reviewerUserId,
          reviewNotes: params.reasonNotes,
          reviewedAt: new Date(),
        },
      });

      // Append general audit log
      await tx.auditLog.create({
        data: {
          actorId: params.reviewerUserId,
          actorRole: params.reviewerRole,
          action: `VERIFICATION_${params.status}`,
          entityType: 'MechanicProfile',
          entityId: params.mechanicProfileId,
          diffJson: {
            fromStatus: mechanic.verificationStatus,
            toStatus: params.status,
            reason: params.reasonNotes,
          },
        },
      });

      return m;
    });

    // Notify mechanic via SMS
    const statusMsg = params.status === VerificationStatus.APPROVED
      ? 'Your RoadSaathi mechanic profile has been APPROVED! You can now go online to receive roadside jobs.'
      : `Your RoadSaathi verification status is now ${params.status}: ${params.reasonNotes}`;

    await this.notifications.sendNotification({
      recipientPhone: mechanic.user.phone,
      channel: NotificationChannel.SMS,
      title: `Profile ${params.status} - RoadSaathi`,
      body: statusMsg,
      payload: { status: params.status, reason: params.reasonNotes },
    });

    return updated;
  }

  /**
   * Active Job Monitor with Stale-Job Alerts
   * Flag jobs that have been in EN_ROUTE or DIAGNOSING for > 30 minutes
   */
  async getActiveJobsMonitor() {
    const activeJobs = await this.prisma.booking.findMany({
      where: {
        status: {
          in: [
            BookingStatus.OFFERED,
            BookingStatus.ASSIGNED,
            BookingStatus.EN_ROUTE,
            BookingStatus.ARRIVED,
            BookingStatus.DIAGNOSING,
            BookingStatus.AWAITING_QUOTE_APPROVAL,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETION_PENDING,
          ],
        },
      },
      include: {
        customerProfile: { include: { user: true } },
        mechanicProfile: { include: { user: true } },
        vehicle: true,
        quotes: { orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = Date.now();
    const staleThresholdMs = 30 * 60 * 1000; // 30 minutes

    return activeJobs.map((job) => {
      const timeSinceUpdateMs = now - new Date(job.updatedAt).getTime();
      const isStale = timeSinceUpdateMs > staleThresholdMs;

      return {
        ...job,
        timeSinceUpdateMinutes: Math.round(timeSinceUpdateMs / 60000),
        isStale,
        alertReason: isStale ? `No status update for ${Math.round(timeSinceUpdateMs / 60000)} minutes` : null,
      };
    });
  }

  /**
   * Manual Reassignment / Dispatch Fallback
   */
  async manualReassign(params: {
    bookingId: string;
    newMechanicProfileId: string;
    adminUserId: string;
    adminRole: UserRole;
    reason: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.bookingId },
        include: { mechanicProfile: true, customerProfile: { include: { user: true } } },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const targetMechanic = await tx.mechanicProfile.findUnique({
        where: { id: params.newMechanicProfileId },
        include: { user: true },
      });

      if (!targetMechanic) {
        throw new NotFoundException('Target mechanic not found');
      }

      if (targetMechanic.currentActiveBookingId !== null) {
        throw new ConflictException('Target mechanic already has an active roadside job');
      }

      // Free old mechanic if assigned
      if (booking.mechanicProfileId) {
        await tx.mechanicProfile.update({
          where: { id: booking.mechanicProfileId },
          data: { currentActiveBookingId: null },
        });
      }

      // Assign new mechanic
      await tx.mechanicProfile.update({
        where: { id: targetMechanic.id },
        data: { currentActiveBookingId: booking.id },
      });

      const updated = await tx.booking.update({
        where: { id: params.bookingId },
        data: {
          mechanicProfileId: targetMechanic.id,
          status: BookingStatus.ASSIGNED,
          assignedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: params.adminUserId,
          actorRole: params.adminRole,
          action: 'MANUAL_REASSIGNMENT',
          entityType: 'Booking',
          entityId: params.bookingId,
          diffJson: {
            previousMechanicId: booking.mechanicProfileId,
            newMechanicId: targetMechanic.id,
            reason: params.reason,
          },
        },
      });

      // Notify customer
      await this.notifications.sendNotification({
        recipientPhone: booking.customerProfile.user.phone,
        channel: NotificationChannel.SMS,
        title: 'Mechanic Reassigned - RoadSaathi',
        body: `Support has reassigned your request to ${targetMechanic.fullName}. Reason: ${params.reason}`,
        payload: { bookingId: booking.id },
      });

      return updated;
    });
  }

  /**
   * Real Operational Metrics Report
   */
  async getOperationalMetrics() {
    const totalBookings = await this.prisma.booking.count();
    const completedBookings = await this.prisma.booking.count({ where: { status: 'COMPLETED' } });
    const cancelledBookings = await this.prisma.booking.count({ where: { status: 'CANCELLED' } });
    const activeProviders = await this.prisma.mechanicProfile.count({
      where: { isOnline: true, verificationStatus: 'APPROVED' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { status: 'CAPTURED' },
      select: { amountPaise: true },
    });

    const grossTransactionValuePaise = payments.reduce((acc, p) => acc + p.amountPaise, 0);

    const commissionEntries = await this.prisma.ledgerEntry.findMany({
      where: { entryType: 'PLATFORM_COMMISSION' },
      select: { creditPaise: true },
    });

    const netPlatformRevenuePaise = commissionEntries.reduce((acc, c) => acc + c.creditPaise, 0);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      completionRatePercent: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
      activeProvidersOnline: activeProviders,
      grossTransactionValuePaise,
      netPlatformRevenuePaise,
    };
  }

  async listAllMechanics() {
    return this.prisma.mechanicProfile.findMany({
      include: {
        user: true,
        documents: true,
        services: { include: { serviceCategory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
