import { Controller, Post, Get, Body, UseGuards, Put } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/adapters/auth.adapter.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  @Post('otp/send')
  async sendOtp(@Body() body: { phone: string; role?: any }) {
    return this.authService.sendOtp(body.phone, body.role);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() body: { phone: string; otp: string; role?: any }) {
    return this.authService.verifyOtp(body.phone, body.otp, body.role);
  }

  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string; mfaCode?: string }) {
    return this.authService.adminLogin(body.email, body.password, body.mfaCode);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: TokenPayload) {
    return this.authService.getProfile(user.userId);
  }

  @Put('customer/profile')
  @UseGuards(JwtAuthGuard)
  async updateCustomerProfile(
    @CurrentUser('userId') userId: string,
    @Body() body: { name?: string; emergencyContact?: string; preferredLanguage?: string }
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        preferredLanguage: body.preferredLanguage,
        customerProfile: {
          update: {
            emergencyContact: body.emergencyContact,
          },
        },
      },
      include: {
        customerProfile: true,
      },
    });
  }

  @Post('customer/vehicles')
  @UseGuards(JwtAuthGuard)
  async addVehicle(
    @CurrentUser('userId') userId: string,
    @Body() body: any
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user || !user.customerProfile) {
      throw new Error('Customer profile does not exist');
    }

    return this.prisma.vehicle.create({
      data: {
        customerProfileId: user.customerProfile.id,
        make: body.make,
        model: body.model,
        year: body.year,
        vehicleType: body.vehicleType,
        fuelType: body.fuelType || 'PETROL',
        registrationNumber: body.registrationNumber,
        isDefault: body.isDefault ?? false,
      },
    });
  }

  @Get('customer/vehicles')
  @UseGuards(JwtAuthGuard)
  async listVehicles(@CurrentUser('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: {
          include: {
            vehicles: true,
          },
        },
      },
    });

    return user?.customerProfile?.vehicles || [];
  }
}
