import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MapsAdapter } from '../../common/adapters/maps.adapter.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import {
  BookingStatus,
  DispatchOfferStatus,
  UserRole,
  NotificationChannel,
  ProblemCategory,
} from '@prisma/client';
import {
  canTransition,
  calculateVisitPricing,
} from '@roadsaathi/contracts';
import crypto from 'node:crypto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsAdapter,
    private readonly notifications: NotificationsAdapter
  ) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private generate4DigitCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Create a new booking request
   * Flow A: Targeted request to a chosen mechanic
   * Flow B: Broadcast to eligible mechanics within radius and fee ceiling
   */
  async createBooking(params: {
    customerProfileId: string;
    vehicleId: string;
    problemCategory: ProblemCategory;
    problemDescription?: string;
    photoUrls?: string[];
    customerLatitude: number;
    customerLongitude: number;
    customerAddress: string;
    customerLandmark?: string;
    targetMechanicId?: string;
    maxAcceptedVisitFeePaise: number;
    idempotencyKey: string;
  }) {
    // Idempotency check: if booking already exists with this key, return it
    const existing = await this.prisma.booking.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: {
        customerProfile: { include: { user: true } },
        vehicle: true,
        mechanicProfile: true,
        quotes: { include: { items: true } },
      },
    });

    if (existing) {
      return existing;
    }

    const bookingNumber = `RS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Calculate initial estimated fee breakdown
    const initialPricing = calculateVisitPricing({
      baseVisitFeePaise: 29900,
      roadDistanceMeters: 3000,
    });

    // Create booking in SEARCHING / OFFERED state
    const booking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          bookingNumber,
          customerProfileId: params.customerProfileId,
          vehicleId: params.vehicleId,
          problemCategory: params.problemCategory,
          problemDescription: params.problemDescription,
          photoUrls: params.photoUrls ?? [],
          customerLatitude: params.customerLatitude,
          customerLongitude: params.customerLongitude,
          customerAddress: params.customerAddress,
          customerLandmark: params.customerLandmark,
          status: BookingStatus.OFFERED,
          acceptedVisitFeePaise: initialPricing.baseVisitFeePaise,
          distanceSurchargePaise: initialPricing.distanceSurchargePaise,
          platformFeePaise: initialPricing.platformFeePaise,
          taxPaise: initialPricing.taxPaise,
          totalEstimatedVisitFeePaise: initialPricing.totalVisitFeePaise,
          idempotencyKey: params.idempotencyKey,
        },
      });

      // Record initial event
      await tx.bookingEvent.create({
        data: {
          bookingId: b.id,
          fromStatus: BookingStatus.DRAFT,
          toStatus: BookingStatus.OFFERED,
          actorId: params.customerProfileId,
          actorRole: UserRole.CUSTOMER,
          reason: 'Customer initiated roadside assistance request',
        },
      });

      // If targeted mechanic specified:
      if (params.targetMechanicId) {
        const mechanic = await tx.mechanicProfile.findUnique({
          where: { id: params.targetMechanicId },
        });

        if (mechanic && mechanic.isOnline && mechanic.isRoadsideReady && !mechanic.currentActiveBookingId) {
          const route = await this.maps.calculateRouteEstimate(
            mechanic.latitude,
            mechanic.longitude,
            params.customerLatitude,
            params.customerLongitude,
            mechanic.prepTimeMinutes
          );

          await tx.dispatchOffer.create({
            data: {
              bookingId: b.id,
              mechanicProfileId: mechanic.id,
              status: DispatchOfferStatus.PENDING,
              expiresAt: new Date(Date.now() + 60 * 1000), // 60s countdown
              estimatedDistanceMeters: route.roadDistanceMeters,
              estimatedDurationSeconds: route.travelDurationSeconds,
              estimatedEarningsPaise: Math.round(initialPricing.totalVisitFeePaise * 0.85),
            },
          });
        }
      } else {
        // Broadcast flow: Find eligible online, verified, available mechanics within 10 km
        const eligible = await tx.mechanicProfile.findMany({
          where: {
            verificationStatus: 'APPROVED',
            isOnline: true,
            isRoadsideReady: true,
            currentActiveBookingId: null,
            providerType: { not: 'WORKSHOP_ONLY' },
            services: {
              some: {
                serviceCategory: { code: params.problemCategory },
                isAvailable: true,
              },
            },
          },
          take: 5,
        });

        for (const mechanic of eligible) {
          const route = await this.maps.calculateRouteEstimate(
            mechanic.latitude,
            mechanic.longitude,
            params.customerLatitude,
            params.customerLongitude,
            mechanic.prepTimeMinutes
          );

          await tx.dispatchOffer.create({
            data: {
              bookingId: b.id,
              mechanicProfileId: mechanic.id,
              status: DispatchOfferStatus.PENDING,
              expiresAt: new Date(Date.now() + 90 * 1000),
              estimatedDistanceMeters: route.roadDistanceMeters,
              estimatedDurationSeconds: route.travelDurationSeconds,
              estimatedEarningsPaise: Math.round(initialPricing.totalVisitFeePaise * 0.85),
            },
          });
        }
      }

      return b;
    });

    return this.getBookingById(booking.id);
  }

  /**
   * Atomic Acceptance Engine
   * Prevents double booking:
   * - Booking cannot be won by two mechanics simultaneously
   * - One mechanic cannot accept two active roadside jobs
   */
  async acceptOffer(bookingId: string, offerId: string, mechanicProfileId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch and lock booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { customerProfile: { include: { user: true } } },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== BookingStatus.OFFERED && booking.status !== BookingStatus.SEARCHING) {
        throw new ConflictException(`Booking is no longer available. Current state: ${booking.status}`);
      }

      // 2. Fetch and verify offer
      const offer = await tx.dispatchOffer.findUnique({
        where: { id: offerId },
      });

      if (!offer || offer.bookingId !== bookingId || offer.mechanicProfileId !== mechanicProfileId) {
        throw new BadRequestException('Invalid dispatch offer');
      }

      if (offer.status !== DispatchOfferStatus.PENDING) {
        throw new ConflictException(`Offer has already been resolved: ${offer.status}`);
      }

      if (new Date() > offer.expiresAt) {
        await tx.dispatchOffer.update({
          where: { id: offerId },
          data: { status: DispatchOfferStatus.EXPIRED },
        });
        throw new ConflictException('This offer has expired');
      }

      // 3. Fetch mechanic and verify zero active jobs
      const mechanic = await tx.mechanicProfile.findUnique({
        where: { id: mechanicProfileId },
        include: { user: true },
      });

      if (!mechanic) {
        throw new NotFoundException('Mechanic profile not found');
      }

      if (mechanic.currentActiveBookingId !== null) {
        throw new ConflictException('Mechanic already has an active roadside job in progress');
      }

      // 4. Generate Secret 4-digit Arrival OTP (stored hashed, given only to customer)
      const rawArrivalOtp = this.generate4DigitCode();
      const arrivalOtpHash = this.hashOtp(rawArrivalOtp);

      // 5. Atomically assign booking
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ASSIGNED,
          mechanicProfileId: mechanic.id,
          assignedAt: new Date(),
          arrivalOtpHash,
          arrivalOtpExpiresAt: new Date(Date.now() + 4 * 3600 * 1000), // 4h expiry
          arrivalOtpAttempts: 0,
          version: { increment: 1 },
        },
      });

      // 6. Claim mechanic capacity
      await tx.mechanicProfile.update({
        where: { id: mechanic.id },
        data: { currentActiveBookingId: bookingId },
      });

      // 7. Mark winning offer ACCEPTED
      await tx.dispatchOffer.update({
        where: { id: offerId },
        data: {
          status: DispatchOfferStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      // 8. Revoke all competing offers
      await tx.dispatchOffer.updateMany({
        where: {
          bookingId,
          id: { not: offerId },
          status: DispatchOfferStatus.PENDING,
        },
        data: {
          status: DispatchOfferStatus.SUPERSEDED,
          respondedAt: new Date(),
        },
      });

      // 9. Append audit log
      await tx.bookingEvent.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.ASSIGNED,
          actorId: mechanic.userId,
          actorRole: UserRole.MECHANIC,
          reason: `Offer accepted by ${mechanic.fullName}`,
        },
      });

      // 10. Notify customer with Arrival Verification Code
      await this.notifications.sendNotification({
        recipientPhone: booking.customerProfile.user.phone,
        channel: NotificationChannel.SMS,
        title: 'Mechanic Assigned - RoadSaathi',
        body: `${mechanic.fullName} has accepted your roadside request. Share code ${rawArrivalOtp} with your mechanic when they arrive.`,
        payload: { bookingId, rawArrivalOtp },
      });

      // Attach raw arrival OTP temporarily for the customer's response
      return {
        ...updatedBooking,
        customerArrivalCode: rawArrivalOtp,
      };
    });
  }

  /**
   * Decline offer by mechanic
   */
  async declineOffer(bookingId: string, offerId: string, mechanicProfileId: string, reason?: string) {
    await this.prisma.dispatchOffer.updateMany({
      where: {
        id: offerId,
        bookingId,
        mechanicProfileId,
        status: DispatchOfferStatus.PENDING,
      },
      data: {
        status: DispatchOfferStatus.DECLINED,
        respondedAt: new Date(),
        declineReason: reason || 'Mechanic declined offer',
      },
    });

    // Check if any offers remain pending
    const remaining = await this.prisma.dispatchOffer.count({
      where: {
        bookingId,
        status: DispatchOfferStatus.PENDING,
      },
    });

    if (remaining === 0) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.UNFULFILLED },
      });

      await this.prisma.bookingEvent.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.OFFERED,
          toStatus: BookingStatus.UNFULFILLED,
          actorId: mechanicProfileId,
          actorRole: UserRole.MECHANIC,
          reason: 'All offered mechanics declined or timed out',
        },
      });
    }

    return { success: true };
  }

  /**
   * Mechanic advances status to EN_ROUTE
   */
  async markEnRoute(bookingId: string, mechanicUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { mechanicProfile: true },
    });

    if (!booking || booking.mechanicProfile?.userId !== mechanicUserId) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    const check = canTransition(booking.status as any, BookingStatus.EN_ROUTE as any, UserRole.MECHANIC as any);
    if (!check.allowed) {
      throw new BadRequestException(check.reason);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.EN_ROUTE,
        version: { increment: 1 },
      },
    });

    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        fromStatus: booking.status,
        toStatus: BookingStatus.EN_ROUTE,
        actorId: mechanicUserId,
        actorRole: UserRole.MECHANIC,
        reason: 'Mechanic is now en route to breakdown location',
      },
    });

    return updated;
  }

  /**
   * Mechanic marks arrival and enters customer's secret 4-digit arrival code
   */
  async verifyArrival(bookingId: string, mechanicUserId: string, otpCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { mechanicProfile: true },
    });

    if (!booking || booking.mechanicProfile?.userId !== mechanicUserId) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    if (booking.arrivalOtpAttempts >= 5) {
      throw new ForbiddenException('Too many failed attempts. Please contact RoadSaathi support.');
    }

    if (!booking.arrivalOtpHash || new Date() > (booking.arrivalOtpExpiresAt || new Date(0))) {
      throw new BadRequestException('Arrival code has expired or is invalid');
    }

    const inputHash = this.hashOtp(otpCode);
    if (inputHash !== booking.arrivalOtpHash) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { arrivalOtpAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect arrival code. Please verify with customer.');
    }

    // Advance to ARRIVED then DIAGNOSING
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.DIAGNOSING,
        arrivedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DIAGNOSING,
        actorId: mechanicUserId,
        actorRole: UserRole.MECHANIC,
        reason: 'Arrival code verified. Mechanic started vehicle diagnosis.',
      },
    });

    return updated;
  }

  /**
   * Generates secret 4-digit completion code when mechanic finishes work
   */
  async requestCompletionCode(bookingId: string, customerUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customerProfile: true },
    });

    if (!booking || booking.customerProfile.userId !== customerUserId) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    const code = this.generate4DigitCode();
    const completionOtpHash = this.hashOtp(code);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        completionOtpHash,
        completionOtpExpiresAt: new Date(Date.now() + 2 * 3600 * 1000), // 2h
        completionOtpAttempts: 0,
      },
    });

    return {
      completionCode: code,
      message: 'Share this completion code with your mechanic only after satisfactory repair inspection',
    };
  }

  /**
   * Mechanic submits customer's completion code to complete service
   */
  async verifyCompletion(bookingId: string, mechanicUserId: string, otpCode: string, notes?: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { mechanicProfile: true, quotes: true },
      });

      if (!booking || booking.mechanicProfile?.userId !== mechanicUserId) {
        throw new ForbiddenException('Not authorized for this booking');
      }

      if (booking.completionOtpAttempts >= 5) {
        throw new ForbiddenException('Too many failed completion attempts');
      }

      const inputHash = this.hashOtp(otpCode);
      if (inputHash !== booking.completionOtpHash) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { completionOtpAttempts: { increment: 1 } },
        });
        throw new BadRequestException('Incorrect completion code');
      }

      // Mark completed & free mechanic's capacity
      const completed = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (booking.mechanicProfileId) {
        await tx.mechanicProfile.update({
          where: { id: booking.mechanicProfileId },
          data: { currentActiveBookingId: null },
        });
      }

      await tx.bookingEvent.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.COMPLETED,
          actorId: mechanicUserId,
          actorRole: UserRole.MECHANIC,
          reason: notes || 'Service successfully completed and verified by customer OTP',
        },
      });

      return completed;
    });
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, actorUserId: string, actorRole: UserRole, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { mechanicProfile: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const check = canTransition(booking.status as any, BookingStatus.CANCELLED as any, actorRole as any);
      if (!check.allowed) {
        throw new BadRequestException(check.reason);
      }

      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledByRole: actorRole,
          version: { increment: 1 },
        },
      });

      // If mechanic was assigned, release capacity
      if (booking.mechanicProfileId) {
        await tx.mechanicProfile.update({
          where: { id: booking.mechanicProfileId },
          data: { currentActiveBookingId: null },
        });
      }

      // Expire open offers
      await tx.dispatchOffer.updateMany({
        where: { bookingId, status: DispatchOfferStatus.PENDING },
        data: { status: DispatchOfferStatus.SUPERSEDED },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          actorId: actorUserId,
          actorRole,
          reason,
        },
      });

      return cancelled;
    });
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customerProfile: { include: { user: true } },
        vehicle: true,
        mechanicProfile: { include: { user: true } },
        quotes: {
          include: { items: true, approval: true },
          orderBy: { version: 'desc' },
        },
        payments: true,
        events: { orderBy: { createdAt: 'desc' } },
        reviews: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async listCustomerBookings(customerProfileId: string) {
    return this.prisma.booking.findMany({
      where: { customerProfileId },
      include: {
        vehicle: true,
        mechanicProfile: true,
        quotes: { include: { items: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMechanicOffers(mechanicProfileId: string) {
    return this.prisma.dispatchOffer.findMany({
      where: {
        mechanicProfileId,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        booking: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: { offeredAt: 'desc' },
    });
  }

  async getMechanicActiveJob(mechanicProfileId: string) {
    const mechanic = await this.prisma.mechanicProfile.findUnique({
      where: { id: mechanicProfileId },
    });

    if (!mechanic || !mechanic.currentActiveBookingId) {
      return null;
    }

    return this.getBookingById(mechanic.currentActiveBookingId);
  }
}
