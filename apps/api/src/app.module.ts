import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { LedgerModule } from './modules/ledger/ledger.module.js';
import { TrackingModule } from './modules/tracking/tracking.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'RoadSaathi API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Get('ready')
  async readiness() {
    try {
      // Ping database
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'not_ready',
        database: 'disconnected',
        error: err.message,
      };
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DiscoveryModule,
    BookingsModule,
    QuotesModule,
    PaymentsModule,
    LedgerModule,
    TrackingModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
