import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MapsAdapter } from '../../common/adapters/maps.adapter.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService, MapsAdapter, NotificationsAdapter, AuthAdapter],
  exports: [BookingsService],
})
export class BookingsModule {}
