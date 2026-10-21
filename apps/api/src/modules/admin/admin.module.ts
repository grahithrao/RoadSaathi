import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, NotificationsAdapter, AuthAdapter],
  exports: [AdminService],
})
export class AdminModule {}
