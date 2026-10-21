import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthAdapter } from '../adapters/auth.adapter.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authAdapter: AuthAdapter) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const payload = this.authAdapter.verifyJwt(token);
    request.user = payload;
    return true;
  }
}
