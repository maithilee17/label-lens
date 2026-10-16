import {
  addMonths,
  calculateShelfLifeDeadline,
  calculateAfterOpeningDeadline,
  getApplicableDeadline,
  computeExpiryStatus,
  checkExpiryDiscrepancy
} from '../services/expiryService.js';

describe('Expiry Service', () => {
  test('handles leap year month arithmetic accurately', () => {
    // 2024 is a leap year. Jan 31 + 1 month should be Feb 29, 2024.
    const jan31Leap = new Date(Date.UTC(2024, 0, 31));
    const feb29Leap = addMonths(jan31Leap, 1);
    expect(feb29Leap.getUTCFullYear()).toBe(2024);
    expect(feb29Leap.getUTCMonth()).toBe(1); // February (0-indexed)
    expect(feb29Leap.getUTCDate()).toBe(29);

    // 2023 is not a leap year. Jan 31 + 1 month should be Feb 28, 2023.
    const jan31NonLeap = new Date(Date.UTC(2023, 0, 31));
    const feb28NonLeap = addMonths(jan31NonLeap, 1);
    expect(feb28NonLeap.getUTCFullYear()).toBe(2023);
    expect(feb28NonLeap.getUTCMonth()).toBe(1);
    expect(feb28NonLeap.getUTCDate()).toBe(28);
  });

  test('calculates shelf life deadline from manufacturing date and duration', () => {
    const mfg = new Date(Date.UTC(2025, 5, 15)); // June 15, 2025
    const expiry = calculateShelfLifeDeadline(mfg, 12); // 12 months
    expect(expiry.getUTCFullYear()).toBe(2026);
    expect(expiry.getUTCMonth()).toBe(5); // June
    expect(expiry.getUTCDate()).toBe(15);
  });

  test('calculates PAO deadline', () => {
    const opened = new Date(Date.UTC(2026, 0, 10)); // Jan 10, 2026
    const paoDeadline = calculateAfterOpeningDeadline(opened, 6); // 6 months
    expect(paoDeadline.getUTCFullYear()).toBe(2026);
    expect(paoDeadline.getUTCMonth()).toBe(6); // July
    expect(paoDeadline.getUTCDate()).toBe(10);
  });

  test('selects earlier deadline when both printed expiry and PAO exist', () => {
    const product = {
      printedExpiryDate: new Date(Date.UTC(2026, 11, 31)), // Dec 31, 2026
      openedAt: new Date(Date.UTC(2026, 0, 1)),
      afterOpeningDeadline: new Date(Date.UTC(2026, 5, 1)) // June 1, 2026
    };

    const applicable = getApplicableDeadline(product);
    expect(applicable.source).toBe('after_opening');
    expect(applicable.date.getTime()).toBe(product.afterOpeningDeadline.getTime());
  });

  test('computes status correctly: expired, expiring_soon, fresh, unknown', () => {
    const referenceDate = new Date(Date.UTC(2026, 5, 15)); // June 15, 2026

    // Expired
    const expiredProduct = {
      printedExpiryDate: new Date(Date.UTC(2026, 4, 1)) // May 1, 2026
    };
    expect(computeExpiryStatus(expiredProduct, referenceDate)).toBe('expired');

    // Expiring soon (within 7 days)
    const soonProduct = {
      printedExpiryDate: new Date(Date.UTC(2026, 5, 18)) // June 18, 2026 (3 days away)
    };
    expect(computeExpiryStatus(soonProduct, referenceDate)).toBe('expiring_soon');

    // Fresh (> 7 days)
    const freshProduct = {
      printedExpiryDate: new Date(Date.UTC(2026, 7, 20)) // Aug 20, 2026
    };
    expect(computeExpiryStatus(freshProduct, referenceDate)).toBe('fresh');

    // Unknown
    const unknownProduct = {};
    expect(computeExpiryStatus(unknownProduct, referenceDate)).toBe('unknown');
  });

  test('flags expiry discrepancy between printed and calculated date', () => {
    const printed = new Date(Date.UTC(2026, 5, 1));
    const calculated = new Date(Date.UTC(2026, 7, 15)); // 75 days difference
    const discrepancy = checkExpiryDiscrepancy(printed, calculated);
    expect(discrepancy.hasDiscrepancy).toBe(true);
    expect(discrepancy.diffDays).toBeGreaterThan(30);
  });
});
