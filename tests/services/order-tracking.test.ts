import { describe, expect, it } from 'vitest';
import { distanceKm, rideMinutes, whatsappNumber } from '@/lib/services/order-tracking';

describe('order tracking helpers', () => {
  it('turns Nigerian phone numbers into WhatsApp numbers', () => {
    expect(whatsappNumber('07033445566')).toBe('2347033445566');
    expect(whatsappNumber('+234 703 344 5566')).toBe('2347033445566');
    expect(whatsappNumber('7033445566')).toBe('2347033445566');
    expect(whatsappNumber('')).toBeNull();
  });
  it('estimates distance and riding time', () => {
    const a = { lat: 6.5059, lng: 3.3615 }, b = { lat: 6.48, lng: 3.4 };
    expect(distanceKm(a, b)).toBeGreaterThan(4);
    expect(distanceKm(a, b)).toBeLessThan(6);
    expect(rideMinutes(a, b)).toBeGreaterThanOrEqual(15);
    expect(rideMinutes(a, a)).toBe(2);
  });
});
