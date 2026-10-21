import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthAdapter } from '../../common/adapters/auth.adapter.js';
import { NotificationsAdapter } from '../../common/adapters/notifications.adapter.js';
import { UserRole, NotificationChannel } from '@prisma/client';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authAdapter: AuthAdapter,
    private readonly notifications: NotificationsAdapter
  ) {}

  async sendOtp(phone: string, role = UserRole.CUSTOMER) {
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0+/, '')}`;
    
    // In dev mode, deterministic code 123456
    const otpCode = process.env.DEV_OTP_CODE || '123456';

    await this.notifications.sendNotification({
      recipientPhone: formattedPhone,
      channel: NotificationChannel.SMS,
      title: 'RoadSaathi Verification Code',
      body: `Your RoadSaathi login code is ${otpCode}. Valid for 10 minutes. Do not share this with anyone.`,
      payload: { otpCode, phone: formattedPhone },
    });

    return {
      success: true,
      phone: formattedPhone,
      message: 'OTP sent successfully',
      isSimulated: process.env.DEV_MODE === 'true',
    };
  }

  async verifyOtp(phone: string, otp: string, role: UserRole = UserRole.CUSTOMER) {
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0+/, '')}`;
    const isValid = await this.authAdapter.verifyPhoneOtp(formattedPhone, otp);

    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone: formattedPhone },
      include: {
        customerProfile: true,
        mechanicProfile: true,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: formattedPhone,
          role,
          name: formattedPhone,
        },
        include: {
          customerProfile: true,
          mechanicProfile: true,
        },
      });
    }

    // Ensure corresponding profile exists
    let customerProfileId = user.customerProfile?.id;
    let mechanicProfileId = user.mechanicProfile?.id;

    if (role === UserRole.CUSTOMER && !customerProfileId) {
      const customer = await this.prisma.customerProfile.create({
        data: { userId: user.id },
      });
      customerProfileId = customer.id;
    } else if (role === UserRole.MECHANIC && !mechanicProfileId) {
      const mechanic = await this.prisma.mechanicProfile.create({
        data: {
          userId: user.id,
          fullName: user.name || 'New Mechanic',
          businessName: 'Independent Mechanic',
          workshopAddress: 'Pending Address',
          latitude: 12.8698,
          longitude: 74.8431,
        },
      });
      mechanicProfileId = mechanic.id;
    }

    const token = this.authAdapter.generateJwt({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name || undefined,
      customerProfileId,
      mechanicProfileId,
    });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        customerProfileId,
        mechanicProfileId,
      },
    };
  }

  async adminLogin(email: string, password: string, mfaCode?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid administrative credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid administrative credentials');
    }

    const adminRoles: UserRole[] = [
      UserRole.ADMIN_SUPPORT,
      UserRole.ADMIN_VERIFICATION,
      UserRole.ADMIN_FINANCE,
      UserRole.SUPER_ADMIN,
    ];

    if (!adminRoles.includes(user.role)) {
      throw new UnauthorizedException('Access denied: administrative role required');
    }

    const token = this.authAdapter.generateJwt({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name || undefined,
    });

    return {
      token,
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: {
          include: {
            vehicles: true,
          },
        },
        mechanicProfile: {
          include: {
            services: {
              include: {
                serviceCategory: true,
              },
            },
            documents: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }
}
