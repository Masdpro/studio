import { describe, expect, it } from 'vitest';
import { buildSuggestions, typedHouseNumber } from '@/lib/address-search';

describe('address suggestions', () => {
  it('reads the house number the customer typed', () => {
    expect(typedHouseNumber('12 Admiralty Way')).toBe('12');
    expect(typedHouseNumber('12B, Allen Avenue')).toBe('12B');
    expect(typedHouseNumber('Admiralty Way')).toBeNull();
  });
  it('builds full addresses and keeps the typed number when the map only knows the street', () => {
    const s = buildSuggestions('12 Admiralty Way', {
      photon: [
        { geometry: { coordinates: [3.47, 6.44] }, properties: { name: 'Admiralty Way', street: 'Admiralty Way', district: 'Lekki Phase 1', city: 'Lagos', state: 'Lagos State', countrycode: 'NG' } },
        { geometry: { coordinates: [3.36, 6.5] }, properties: { housenumber: '15', street: 'Adeniran Ogunsanya Street', suburb: 'Surulere', city: 'Lagos', countrycode: 'NG' } },
        { geometry: { coordinates: [0, 51] }, properties: { street: 'Admiralty Way', city: 'London', countrycode: 'GB' } },
      ],
    });
    expect(s.map((x) => x.address)).toEqual([
      '12 Admiralty Way, Lekki Phase 1, Lagos, Lagos State',
      '15 Adeniran Ogunsanya Street, Surulere, Lagos',
    ]);
    expect(s[0].latitude).toBe(6.44);
  });
});
