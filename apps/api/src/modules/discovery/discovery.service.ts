import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MapsAdapter } from '../../common/adapters/maps.adapter.js';
import {
  ProblemCategory,
  VehicleType,
  VerificationStatus,
  ProviderType,
} from '@prisma/client';
import { calculateVisitPricing } from '@roadsaathi/contracts';

export interface ProviderSearchResult {
  mechanicProfileId: string;
  fullName: string;
  businessName: string;
  providerType: ProviderType;
  workshopAddress: string;
  straightLineDistanceKm: number;
  roadDistanceKm: number;
  roadDistanceMeters: number;
  travelDurationMinutes: number;
  prepTimeMinutes: number;
  totalEtaMinutes: number;
  isEtaEstimated: boolean;
  baseVisitFeePaise: number;
  pricingBreakdown: {
    baseVisitFeePaise: number;
    distanceSurchargePaise: number;
    platformFeePaise: number;
    taxPaise: number;
    totalVisitFeePaise: number;
  };
  ratingAverage: number;
  ratingCount: number;
  languages: string[];
  isVerified: boolean;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsAdapter
  ) {}

  async searchProviders(params: {
    latitude: number;
    longitude: number;
    problemCategory: ProblemCategory;
    vehicleType?: VehicleType;
    radiusKm?: number;
    maxVisitFeePaise?: number;
  }): Promise<{
    providers: ProviderSearchResult[];
    searchCenter: { latitude: number; longitude: number };
    totalMatches: number;
    suggestWiderSearch: boolean;
  }> {
    const searchRadiusKm = params.radiusKm || 10;

    // Strict Server-Side Candidate Shortlisting:
    // 1. Must be VERIFIED (APPROVED)
    // 2. Must be ONLINE
    // 3. Must be ROADSIDE READY (isRoadsideReady = true) -> WORKSHOP_ONLY are strictly EXCLUDED from roadside jobs!
    // 4. Must NOT currently be on an active job (currentActiveBookingId IS NULL)
    // 5. Must offer the requested problemCategory
    const candidates = await this.prisma.mechanicProfile.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        isOnline: true,
        isRoadsideReady: true,
        currentActiveBookingId: null,
        providerType: {
          not: ProviderType.WORKSHOP_ONLY, // Physical proximity alone NEVER implies roadside availability!
        },
        services: {
          some: {
            serviceCategory: {
              code: params.problemCategory,
            },
            isAvailable: true,
          },
        },
      },
      include: {
        services: {
          include: {
            serviceCategory: true,
          },
        },
      },
    });

    const results: ProviderSearchResult[] = [];

    for (const mechanic of candidates) {
      // Calculate straight-line distance via Haversine
      const straightLineMeters = this.maps.calculateHaversineDistanceMeters(
        params.latitude,
        params.longitude,
        mechanic.latitude,
        mechanic.longitude
      );

      const straightLineKm = straightLineMeters / 1000;

      // Filter by mechanic's declared operating service radius and search radius
      if (straightLineKm > mechanic.serviceRadiusKm || straightLineKm > searchRadiusKm) {
        continue;
      }

      // Calculate realistic road-based route estimate & ETA
      const route = await this.maps.calculateRouteEstimate(
        mechanic.latitude,
        mechanic.longitude,
        params.latitude,
        params.longitude,
        mechanic.prepTimeMinutes
      );

      // Compute transparent itemized visit fee breakdown
      const pricing = calculateVisitPricing({
        baseVisitFeePaise: mechanic.baseVisitFeePaise,
        roadDistanceMeters: route.roadDistanceMeters,
      });

      // Filter by customer's max visit fee ceiling if specified
      if (params.maxVisitFeePaise && pricing.totalVisitFeePaise > params.maxVisitFeePaise) {
        continue;
      }

      results.push({
        mechanicProfileId: mechanic.id,
        fullName: mechanic.fullName,
        businessName: mechanic.businessName,
        providerType: mechanic.providerType,
        workshopAddress: mechanic.workshopAddress,
        straightLineDistanceKm: Math.round(straightLineKm * 10) / 10,
        roadDistanceKm: Math.round((route.roadDistanceMeters / 1000) * 10) / 10,
        roadDistanceMeters: route.roadDistanceMeters,
        travelDurationMinutes: Math.ceil(route.travelDurationSeconds / 60),
        prepTimeMinutes: mechanic.prepTimeMinutes,
        totalEtaMinutes: route.totalEtaMinutes,
        isEtaEstimated: route.isSimulated,
        baseVisitFeePaise: mechanic.baseVisitFeePaise,
        pricingBreakdown: {
          baseVisitFeePaise: pricing.baseVisitFeePaise,
          distanceSurchargePaise: pricing.distanceSurchargePaise,
          platformFeePaise: pricing.platformFeePaise,
          taxPaise: pricing.taxPaise,
          totalVisitFeePaise: pricing.totalVisitFeePaise,
        },
        ratingAverage: mechanic.ratingAverage,
        ratingCount: mechanic.ratingCount,
        languages: mechanic.languages,
        isVerified: mechanic.verificationStatus === VerificationStatus.APPROVED,
      });
    }

    // Honest Ranking: Primary sort by Suitability & Total ETA, Secondary by Rating.
    // Never prioritize commission over suitability.
    results.sort((a, b) => {
      if (a.totalEtaMinutes !== b.totalEtaMinutes) {
        return a.totalEtaMinutes - b.totalEtaMinutes;
      }
      return b.ratingAverage - a.ratingAverage;
    });

    return {
      providers: results,
      searchCenter: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
      totalMatches: results.length,
      suggestWiderSearch: results.length === 0 && searchRadiusKm < 25,
    };
  }

  async listCategories() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { defaultVisitFeePaise: 'asc' },
    });
  }
}
