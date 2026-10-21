import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import crypto from 'node:crypto';

export interface TokenPayload {
  userId: string;
  phone: string;
  role: string;
  name?: string;
  mechanicProfileId?: string;
  customerProfileId?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthAdapter {
  private readonly logger = new Logger(AuthAdapter.name);
  private readonly secret = process.env.JWT_SECRET || 'dev_roadsaathi_secret_key_change_in_prod';
  private readonly devMode = process.env.DEV_MODE === 'true';
  private readonly devOtp = process.env.DEV_OTP_CODE || '123456';

  /**
   * Generates a tamper-proof signed JWT
   */
  generateJwt(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresInSeconds = 86400 * 7): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    return `${b64Header}.${b64Payload}.${signature}`;
  }

  /**
   * Verifies and decodes a JWT token
   */
  verifyJwt(token: string): TokenPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Malformed token');
      }

      const [b64Header, b64Payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${b64Header}.${b64Payload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new UnauthorizedException('Invalid token signature');
      }

      const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8')) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Token expired');
      }

      return payload;
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Token verification failed');
    }
  }

  /**
   * Verifies Phone OTP
   */
  async verifyPhoneOtp(phone: string, otp: string): Promise<boolean> {
    if (this.devMode && otp === this.devOtp) {
      this.logger.log(`[DEV MODE] Verified OTP ${otp} for phone ${phone}`);
      return true;
    }

    // In production, integrate with Firebase Auth or SMS Gateway verify endpoint
    if (!this.devMode) {
      this.logger.warn('Production Firebase Auth credentials required for live OTP verification');
      return false;
    }

    return false;
  }
}
