import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { checkAll, confirmPassword, nigerianMobile, rules } from '@/lib/field-rules';
import { normalizeNigerianPhone } from '@/lib/verification';

describe('sign-up and profile field rules', () => {
  it('the phone app uses exactly the same rules as the website', () => {
    const web = readFileSync(path.join(__dirname, '../src/lib/field-rules.ts'), 'utf8');
    const app = readFileSync(path.join(__dirname, '../native/src/lib/field-rules.ts'), 'utf8');
    expect(app).toBe(web);
  });

  it('names', () => {
    expect(rules.personName('Adaeze Okafor')).toBeNull();
    expect(rules.personName("Tolu O'Neil-Bello")).toBeNull();
    expect(rules.personName('')).toMatch(/enter your name/i);
    expect(rules.personName('A')).toMatch(/at least 2/);
    expect(rules.personName('Ade123')).toMatch(/letters only/);
    expect(rules.businessName('Mama Cass Kitchen')).toBeNull();
    expect(rules.businessName('7Up Depot')).toBeNull();
    expect(rules.businessName('1234')).toMatch(/letters/);
  });

  it('email and password', () => {
    expect(rules.email('ade@example.com')).toBeNull();
    expect(rules.email('ade@example')).toMatch(/valid email/);
    expect(rules.email('ade example.com')).toMatch(/valid email/);
    expect(rules.newPassword('short')).toMatch(/at least 8/);
    expect(rules.newPassword('        ')).toMatch(/only spaces/);
    expect(rules.newPassword('a'.repeat(73))).toMatch(/72/);
    expect(rules.newPassword('password123')).toBeNull();
    expect(confirmPassword('password123', 'password124')).toMatch(/match/);
    expect(confirmPassword('password123', 'password123')).toBeNull();
  });

  it('Nigerian mobile numbers, the same way the server reads them', () => {
    for (const n of ['08012345678', '+2348012345678', '0701 234 5678', '9012345678']) {
      expect(rules.phone(n)).toBeNull();
      expect(nigerianMobile(n)).toBe(normalizeNigerianPhone(n));
    }
    for (const n of ['0801234567', '12345678901', 'phone']) expect(rules.phone(n)).toMatch(/valid Nigerian mobile/);
  });

  it('addresses, places, links and years', () => {
    expect(rules.streetAddress('12 Admiralty Way')).toBeNull();
    expect(rules.streetAddress('12')).toMatch(/full address/);
    expect(rules.streetAddress('12345')).toMatch(/street name/);
    expect(rules.place('Lekki Phase 1')).toBeNull();
    expect(rules.place('Port Harcourt')).toBeNull();
    expect(rules.place('123')).toMatch(/letters/);
    expect(rules.optionalUrl('')).toBeNull();
    expect(rules.optionalUrl('https://instagram.com/mamacass')).toBeNull();
    expect(rules.optionalUrl('instagram')).toMatch(/https/);
    expect(rules.optionalLinkName('mama-cass')).toBeNull();
    expect(rules.optionalLinkName('mama cass!')).toMatch(/letters, numbers/);
    expect(rules.optionalYear('2018')).toBeNull();
    expect(rules.optionalYear('1800')).toMatch(/between 1950/);
    expect(rules.optional(rules.streetAddress)('')).toBeNull();
  });

  it('amounts, counts, codes, bank accounts and choices', () => {
    const topUp = rules.naira('the amount', 100, 1_000_000);
    expect(topUp('5,000')).toBeNull();
    expect(topUp('50')).toMatch(/at least ₦100/);
    expect(topUp('2000000')).toMatch(/more than ₦1,000,000/);
    expect(topUp('five')).toMatch(/as a number/);
    expect(rules.wholeNumber('the stock')('12')).toBeNull();
    expect(rules.wholeNumber('the stock')('1.5')).toMatch(/whole number/);
    expect(rules.digits(4, 'the delivery code')('1234')).toBeNull();
    expect(rules.digits(4, 'the delivery code')('123')).toMatch(/4 digits/);
    expect(rules.accountNumber('0123456789')).toBeNull();
    expect(rules.accountNumber('012345678')).toMatch(/10 digits/);
    expect(rules.text('a reason', 3, 200)('ok')).toMatch(/at least 3/);
    expect(rules.chosen('your bank')('')).toMatch(/Choose your bank/);
  });

  it('checkAll returns only the fields that need fixing', () => {
    expect(checkAll({ name: 'Ade', email: 'bad' }, { name: rules.personName, email: rules.email })).toEqual({ email: expect.stringMatching(/valid email/) });
  });
});
