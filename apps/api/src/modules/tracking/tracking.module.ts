import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  providers: [TrackingGateway, PrismaService, AuthAdapter],
  exports: [TrackingGateway],
})
export class TrackingModule {}
