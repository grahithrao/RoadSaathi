import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PaymentsAdapter } from '../../common/adapters/payments.adapter.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaService,
    PaymentsAdapter,
    LedgerService,
    NotificationsAdapter,
    AuthAdapter,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
