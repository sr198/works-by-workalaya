/**
 * GeoPoint — latitude/longitude coordinate.
 * Used for provider location (PostGIS GEOGRAPHY(POINT, 4326)).
 */
export class GeoPoint {
  private constructor(
    private readonly lat: number,
    private readonly lng: number,
  ) {}

  static create(latitude: number, longitude: number): GeoPoint {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Latitude must be between -90 and 90, got: ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Longitude must be between -180 and 180, got: ${longitude}`);
    }
    return new GeoPoint(latitude, longitude);
  }

  get latitude(): number {
    return this.lat;
  }

  get longitude(): number {
    return this.lng;
  }

  /** Haversine distance in kilometers */
  distanceTo(other: GeoPoint): number {
    const R = 6371;
    const dLat = toRad(other.lat - this.lat);
    const dLng = toRad(other.lng - this.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.lat)) * Math.cos(toRad(other.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** PostGIS-compatible WKT string */
  toWKT(): string {
    return `POINT(${this.lng} ${this.lat})`;
  }

  equals(other: GeoPoint): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }

  toString(): string {
    return `(${this.lat}, ${this.lng})`;
  }
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
