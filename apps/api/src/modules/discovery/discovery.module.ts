import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryController } from './discovery.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MapsAdapter } from '../../common/adapters/maps.adapter.js';

@Module({
  controllers: [DiscoveryController],
  providers: [DiscoveryService, PrismaService, MapsAdapter],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
