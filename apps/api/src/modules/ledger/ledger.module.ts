import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service.js';
import { LedgerController } from './ledger.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, PrismaService, AuthAdapter],
  exports: [LedgerService],
})
export class LedgerModule {}
