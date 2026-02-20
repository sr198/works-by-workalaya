import { describe, it, expect } from 'vitest';
import { GeoPoint } from './geo-point';

describe('GeoPoint', () => {
  // Kathmandu coordinates
  const kathmandu = GeoPoint.create(27.7172, 85.324);

  it('creates with valid coordinates', () => {
    expect(kathmandu.latitude).toBe(27.7172);
    expect(kathmandu.longitude).toBe(85.324);
  });

  it('rejects invalid latitude', () => {
    expect(() => GeoPoint.create(91, 0)).toThrow('Latitude');
    expect(() => GeoPoint.create(-91, 0)).toThrow('Latitude');
  });

  it('rejects invalid longitude', () => {
    expect(() => GeoPoint.create(0, 181)).toThrow('Longitude');
    expect(() => GeoPoint.create(0, -181)).toThrow('Longitude');
  });

  it('calculates distance in km (Haversine)', () => {
    const pokhara = GeoPoint.create(28.2096, 83.9856);
    const dist = kathmandu.distanceTo(pokhara);
    // Kathmandu → Pokhara is ~150 km
    expect(dist).toBeGreaterThan(140);
    expect(dist).toBeLessThan(160);
  });

  it('distance to self is 0', () => {
    expect(kathmandu.distanceTo(kathmandu)).toBe(0);
  });

  it('produces PostGIS WKT', () => {
    expect(kathmandu.toWKT()).toBe('POINT(85.324 27.7172)');
  });

  it('equals by value', () => {
    const same = GeoPoint.create(27.7172, 85.324);
    const different = GeoPoint.create(28.0, 85.0);
    expect(kathmandu.equals(same)).toBe(true);
    expect(kathmandu.equals(different)).toBe(false);
  });
});
