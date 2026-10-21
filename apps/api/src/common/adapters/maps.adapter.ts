import { Injectable, Logger } from '@nestjs/common';

export interface RouteEstimate {
  straightLineDistanceMeters: number;
  roadDistanceMeters: number;
  travelDurationSeconds: number;
  prepTimeMinutes: number;
  totalEtaMinutes: number;
  isSimulated: boolean;
}

@Injectable()
export class MapsAdapter {
  private readonly logger = new Logger(MapsAdapter.name);
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  /**
   * Calculates straight line distance using Haversine formula
   */
  calculateHaversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Calculates road distance and realistic ETA considering preparation time and Indian city traffic
   */
  async calculateRouteEstimate(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    prepTimeMinutes = 15
  ): Promise<RouteEstimate> {
    const straightLineDistanceMeters = this.calculateHaversineDistanceMeters(
      originLat,
      originLng,
      destLat,
      destLng
    );

    // If Google Maps API key is configured, query Google Routes API
    if (this.apiKey && this.apiKey.trim().length > 10) {
      try {
        const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
            destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const roadDistanceMeters = route.distanceMeters;
            const durationSecs = parseInt(route.duration.replace('s', ''), 10);
            const travelMins = Math.ceil(durationSecs / 60);

            return {
              straightLineDistanceMeters,
              roadDistanceMeters,
              travelDurationSeconds: durationSecs,
              prepTimeMinutes,
              totalEtaMinutes: prepTimeMinutes + travelMins,
              isSimulated: false,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`Google Maps API failed, falling back to deterministic routing model: ${err}`);
      }
    }

    // Deterministic High-Fidelity Routing Model:
    // Road distance in Indian urban / semi-urban cities is approx 1.35x straight-line distance
    const roadDistanceMeters = Math.round(straightLineDistanceMeters * 1.35);

    // Speed model: 25 km/h average speed in urban traffic (approx 6.94 m/s)
    const urbanSpeedMps = 6.94;
    const travelDurationSeconds = Math.max(180, Math.round(roadDistanceMeters / urbanSpeedMps));
    const travelMinutes = Math.ceil(travelDurationSeconds / 60);

    return {
      straightLineDistanceMeters,
      roadDistanceMeters,
      travelDurationSeconds,
      prepTimeMinutes,
      totalEtaMinutes: prepTimeMinutes + travelMinutes,
      isSimulated: true,
    };
  }
}
