import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthAdapter, NotificationsAdapter, PrismaService],
  exports: [AuthService, AuthAdapter],
})
export class AuthModule {}
