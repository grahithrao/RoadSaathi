import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  async createQuote(
    @CurrentUser('userId') mechanicUserId: string,
    @Body() body: any
  ) {
    return this.quotesService.createQuote({
      bookingId: body.bookingId,
      mechanicUserId,
      items: body.items,
      notes: body.notes,
      validUntilMinutes: body.validUntilMinutes,
    });
  }

  @Post('decision')
  async decideQuote(
    @CurrentUser('userId') customerUserId: string,
    @Body() body: { quoteId: string; version: number; decision: 'ACCEPT' | 'REJECT'; rejectionReason?: string }
  ) {
    return this.quotesService.decideQuote({
      quoteId: body.quoteId,
      version: body.version,
      decision: body.decision,
      customerUserId,
      rejectionReason: body.rejectionReason,
    });
  }
}
