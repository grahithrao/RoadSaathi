import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/adapters/auth.adapter.js';
import { UserRole } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async createBooking(
    @CurrentUser() user: TokenPayload,
    @Body() body: any
  ) {
    if (!user.customerProfileId) {
      throw new Error('Customer profile required to create booking');
    }

    return this.bookingsService.createBooking({
      customerProfileId: user.customerProfileId,
      vehicleId: body.vehicleId,
      problemCategory: body.problemCategory,
      problemDescription: body.problemDescription,
      photoUrls: body.photoUrls,
      customerLatitude: body.customerLatitude,
      customerLongitude: body.customerLongitude,
      customerAddress: body.customerAddress,
      customerLandmark: body.customerLandmark,
      targetMechanicId: body.targetMechanicId,
      maxAcceptedVisitFeePaise: body.maxAcceptedVisitFeePaise || 50000,
      idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
    });
  }

  @Post(':id/accept')
  async acceptOffer(
    @Param('id') bookingId: string,
    @CurrentUser() user: TokenPayload,
    @Body('offerId') offerId: string
  ) {
    if (!user.mechanicProfileId) {
      throw new Error('Mechanic profile required to accept offer');
    }
    return this.bookingsService.acceptOffer(bookingId, offerId, user.mechanicProfileId);
  }

  @Post(':id/decline')
  async declineOffer(
    @Param('id') bookingId: string,
    @CurrentUser() user: TokenPayload,
    @Body() body: { offerId: string; reason?: string }
  ) {
    if (!user.mechanicProfileId) {
      throw new Error('Mechanic profile required to decline offer');
    }
    return this.bookingsService.declineOffer(bookingId, body.offerId, user.mechanicProfileId, body.reason);
  }

  @Post(':id/en-route')
  async markEnRoute(
    @Param('id') bookingId: string,
    @CurrentUser('userId') userId: string
  ) {
    return this.bookingsService.markEnRoute(bookingId, userId);
  }

  @Post(':id/verify-arrival')
  async verifyArrival(
    @Param('id') bookingId: string,
    @CurrentUser('userId') userId: string,
    @Body('otpCode') otpCode: string
  ) {
    return this.bookingsService.verifyArrival(bookingId, userId, otpCode);
  }

  @Post(':id/request-completion-code')
  async requestCompletionCode(
    @Param('id') bookingId: string,
    @CurrentUser('userId') userId: string
  ) {
    return this.bookingsService.requestCompletionCode(bookingId, userId);
  }

  @Post(':id/verify-completion')
  async verifyCompletion(
    @Param('id') bookingId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { otpCode: string; notes?: string }
  ) {
    return this.bookingsService.verifyCompletion(bookingId, userId, body.otpCode, body.notes);
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: TokenPayload,
    @Body('reason') reason: string
  ) {
    return this.bookingsService.cancelBooking(bookingId, user.userId, user.role as UserRole, reason);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    return this.bookingsService.getBookingById(id);
  }

  @Get('customer/list')
  async listCustomerBookings(@CurrentUser() user: TokenPayload) {
    if (!user.customerProfileId) {
      return [];
    }
    return this.bookingsService.listCustomerBookings(user.customerProfileId);
  }

  @Get('mechanic/offers')
  async listMechanicOffers(@CurrentUser() user: TokenPayload) {
    if (!user.mechanicProfileId) {
      return [];
    }
    return this.bookingsService.listMechanicOffers(user.mechanicProfileId);
  }

  @Get('mechanic/active-job')
  async getMechanicActiveJob(@CurrentUser() user: TokenPayload) {
    if (!user.mechanicProfileId) {
      return null;
    }
    return this.bookingsService.getMechanicActiveJob(user.mechanicProfileId);
  }
}
