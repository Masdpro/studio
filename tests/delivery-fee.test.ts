import { describe, expect, it } from 'vitest';
import { deliveryFeeForKm, roadKm, DELIVERY_FEE_MAX, DELIVERY_FEE_MIN } from '@/lib/delivery-fee';

describe('delivery fee by distance', () => {
  it('is ₦1,000 for the first 2 km', () => {
    expect(DELIVERY_FEE_MIN).toBe(1000);
    expect(deliveryFeeForKm(0)).toBe(1000);
    expect(deliveryFeeForKm(2)).toBe(1000);
  });
  it('adds ₦100 per km after that, in ₦50 steps', () => {
    expect(deliveryFeeForKm(3)).toBe(1100);
    expect(deliveryFeeForKm(5)).toBe(1300);
    expect(deliveryFeeForKm(8)).toBe(1600);
    expect(deliveryFeeForKm(3.2)).toBe(1150);
  });
  it('never goes above ₦2,500', () => {
    expect(deliveryFeeForKm(17)).toBe(DELIVERY_FEE_MAX);
    expect(deliveryFeeForKm(60)).toBe(2500);
    expect(deliveryFeeForKm(NaN)).toBe(2500);
  });
  it('uses road distance, longer than a straight line', () => {
    const a = { lat: 6.5059, lng: 3.3615 }, b = { lat: 6.52, lng: 3.37 };
    expect(roadKm(a, b)).toBeGreaterThan(1.5);
  });
});

describe('delivery quote (flat for now)', () => {
  it('charges ₦1,000 per shop, whatever the address', async () => {
    const { quoteDelivery } = await import('@/lib/services/delivery-quote');
    const q = await quoteDelivery('Anywhere, Lagos', [{ vendorId: 'a' }, { vendorId: 'b' }]);
    expect(q.quotes.map((x) => x.fee)).toEqual([1000, 1000]);
  });
});
