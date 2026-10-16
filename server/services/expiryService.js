/**
 * Expiry Service for LabelLens
 * Centralizes date arithmetic, precision handling, leap year correctness,
 * shelf-life projection, after-opening deadlines, and status determinations.
 */

import { getDaysInMonth } from './dateParser.js';

/**
 * Add specified months to a date, respecting month-end boundaries and leap years.
 * e.g., Jan 31 + 1 month = Feb 28 (or Feb 29 on leap year).
 */
export function addMonths(date, months) {
  if (!date || isNaN(new Date(date).getTime())) return null;

  const d = new Date(date);
  const currentYear = d.getUTCFullYear();
  const currentMonth = d.getUTCMonth(); // 0-indexed
  const currentDay = d.getUTCDate();

  const targetMonthIndex = currentMonth + months;
  const targetYear = currentYear + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-indexed

  // Month-end clamp
  const daysInTargetMonth = getDaysInMonth(targetYear, normalizedMonth + 1);
  const targetDay = Math.min(currentDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

/**
 * Calculate expiry date from manufacturing date + shelf-life duration in months.
 */
export function calculateShelfLifeDeadline(mfgDate, shelfLifeMonths) {
  if (!mfgDate || !shelfLifeMonths || shelfLifeMonths <= 0) {
    return null;
  }
  return addMonths(mfgDate, shelfLifeMonths);
}

/**
 * Calculate Period After Opening (PAO) deadline from opened date + months.
 */
export function calculateAfterOpeningDeadline(openedAt, months) {
  if (!openedAt || !months || months <= 0) {
    return null;
  }
  return addMonths(openedAt, months);
}

/**
 * Determine the applicable reminder deadline.
 * Policy:
 * 1. If product is opened and has an afterOpeningDeadline, compare with printed/calculated expiry.
 *    The EARLIEST date is the applicable active deadline.
 * 2. If not opened, printedExpiryDate takes precedence over calculatedExpiryDate.
 * 3. If neither exists, returns null.
 */
export function getApplicableDeadline(product) {
  if (!product) return null;

  const printed = product.printedExpiryDate ? new Date(product.printedExpiryDate) : null;
  const calculated = product.calculatedExpiryDate ? new Date(product.calculatedExpiryDate) : null;
  const baseExpiry = printed || calculated;

  const afterOpening = (product.openedAt && product.afterOpeningDeadline)
    ? new Date(product.afterOpeningDeadline)
    : null;

  if (baseExpiry && afterOpening) {
    return baseExpiry.getTime() <= afterOpening.getTime()
      ? { date: baseExpiry, source: printed ? 'printed_expiry' : 'calculated_expiry' }
      : { date: afterOpening, source: 'after_opening' };
  }

  if (baseExpiry) {
    return { date: baseExpiry, source: printed ? 'printed_expiry' : 'calculated_expiry' };
  }

  if (afterOpening) {
    return { date: afterOpening, source: 'after_opening' };
  }

  return null;
}

/**
 * Compute the current expiry status for a product.
 * Returns: 'fresh' | 'expiring_soon' | 'expired' | 'unknown'
 * 
 * Thresholds:
 * - expired: date < now (end of that calendar day)
 * - expiring_soon: within next 7 days (or within 2 days for urgent)
 * - fresh: > 7 days
 * - unknown: no applicable deadline
 */
export function computeExpiryStatus(product, now = new Date(), soonThresholdDays = 7) {
  if (!product) return 'unknown';

  const applicable = getApplicableDeadline(product);
  if (!applicable || !applicable.date || isNaN(applicable.date.getTime())) {
    return 'unknown';
  }

  const deadline = new Date(applicable.date);
  const current = new Date(now);

  // Compare at calendar day boundary in UTC
  const deadlineDay = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  const currentDay = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((deadlineDay - currentDay) / msPerDay);

  if (diffDays < 0) {
    return 'expired';
  }
  if (diffDays <= soonThresholdDays) {
    return 'expiring_soon';
  }
  return 'fresh';
}

/**
 * Check for discrepancies between printed expiry and calculated shelf life.
 * Returns discrepancy warning if difference exceeds 30 days.
 */
export function checkExpiryDiscrepancy(printedExpiryDate, calculatedExpiryDate) {
  if (!printedExpiryDate || !calculatedExpiryDate) return null;

  const printed = new Date(printedExpiryDate).getTime();
  const calculated = new Date(calculatedExpiryDate).getTime();
  const diffDays = Math.abs(Math.round((printed - calculated) / (1000 * 60 * 60 * 24)));

  if (diffDays > 30) {
    return {
      hasDiscrepancy: true,
      diffDays,
      message: `Warning: Printed expiry and calculated shelf-life differ by ${diffDays} days.`
    };
  }

  return { hasDiscrepancy: false, diffDays };
}
