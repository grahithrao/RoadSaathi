import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service.js';
import { ProblemCategory, VehicleType } from '@prisma/client';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  async search(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('problemCategory') problemCategory: ProblemCategory,
    @Query('vehicleType') vehicleType?: VehicleType,
    @Query('radiusKm') radiusKm?: string,
    @Query('maxVisitFeePaise') maxVisitFeePaise?: string
  ) {
    return this.discoveryService.searchProviders({
      latitude: parseFloat(latitude || '12.8698'),
      longitude: parseFloat(longitude || '74.8431'),
      problemCategory: problemCategory || ProblemCategory.FLAT_TYRE,
      vehicleType,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10,
      maxVisitFeePaise: maxVisitFeePaise ? parseInt(maxVisitFeePaise, 10) : undefined,
    });
  }

  @Get('categories')
  async categories() {
    return this.discoveryService.listCategories();
  }
}
