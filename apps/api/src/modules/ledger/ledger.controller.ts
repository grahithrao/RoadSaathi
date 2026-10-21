import { Controller, Get, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TokenPayload } from '../../common/adapters/auth.adapter.js';
import { UserRole } from '@prisma/client';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('mechanic/summary')
  @Roles(UserRole.MECHANIC)
  async getMechanicSummary(@CurrentUser() user: TokenPayload) {
    if (!user.mechanicProfileId) {
      throw new Error('Mechanic profile required');
    }
    return this.ledgerService.getMechanicFinancialSummary(user.mechanicProfileId);
  }

  @Get('admin/entries')
  @Roles(UserRole.ADMIN_FINANCE, UserRole.SUPER_ADMIN)
  async listAdminEntries() {
    return this.ledgerService.listLedgerEntries();
  }
}
