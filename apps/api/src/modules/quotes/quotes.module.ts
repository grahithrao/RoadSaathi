import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import { QuotesController } from './quotes.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, PrismaService, NotificationsAdapter, AuthAdapter],
  exports: [QuotesService],
})
export class QuotesModule {}
