import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TokenPayload } from '../../common/adapters/auth.adapter.js';
import { UserRole, VerificationStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('verifications/pending')
  @Roles(UserRole.ADMIN_VERIFICATION, UserRole.SUPER_ADMIN)
  async getPendingVerifications() {
    return this.adminService.listPendingVerifications();
  }

  @Post('verifications/review')
  @Roles(UserRole.ADMIN_VERIFICATION, UserRole.SUPER_ADMIN)
  async reviewVerification(
    @CurrentUser() user: TokenPayload,
    @Body() body: { mechanicProfileId: string; status: VerificationStatus; reasonNotes: string }
  ) {
    return this.adminService.reviewVerification({
      mechanicProfileId: body.mechanicProfileId,
      reviewerUserId: user.userId,
      reviewerRole: user.role as UserRole,
      status: body.status,
      reasonNotes: body.reasonNotes,
    });
  }

  @Get('jobs/active')
  @Roles(UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN)
  async getActiveJobs() {
    return this.adminService.getActiveJobsMonitor();
  }

  @Post('jobs/reassign')
  @Roles(UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN)
  async manualReassign(
    @CurrentUser() user: TokenPayload,
    @Body() body: { bookingId: string; newMechanicProfileId: string; reason: string }
  ) {
    return this.adminService.manualReassign({
      bookingId: body.bookingId,
      newMechanicProfileId: body.newMechanicProfileId,
      adminUserId: user.userId,
      adminRole: user.role as UserRole,
      reason: body.reason,
    });
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN_FINANCE, UserRole.SUPER_ADMIN)
  async getMetrics() {
    return this.adminService.getOperationalMetrics();
  }

  @Get('mechanics')
  @Roles(UserRole.ADMIN_SUPPORT, UserRole.ADMIN_VERIFICATION, UserRole.SUPER_ADMIN)
  async listMechanics() {
    return this.adminService.listAllMechanics();
  }
}
