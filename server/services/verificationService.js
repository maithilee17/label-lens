/**
 * Verification Service for LabelLens
 * Assesses OCR results, image quality, and date candidate validity
 * to assign an honest verification status and surface actionable warnings.
 */

import { checkExpiryDiscrepancy, calculateShelfLifeDeadline } from './expiryService.js';

export function evaluateVerificationStatus({ imageQuality, ocrResult }) {
  const warnings = [...(imageQuality.warnings || [])];
  const candidates = ocrResult.candidates || [];
  const shelfLife = ocrResult.shelfLife;
  const pao = ocrResult.pao;

  // 1. Check for poor image quality
  if (imageQuality.overallRating === 'poor') {
    return {
      status: 'poor_image_quality',
      statusLabel: 'Poor Image Quality',
      confidenceLevel: 'Low',
      primaryExpiryCandidate: null,
      primaryMfgCandidate: null,
      warnings: [...warnings, 'Image quality is too low for reliable automated detection. Please verify or re-photograph.'],
      requiresUserConfirmation: true
    };
  }

  // 2. No dates found
  if (candidates.length === 0 && !shelfLife && !pao) {
    return {
      status: 'no_date_found',
      statusLabel: 'No Date Found',
      confidenceLevel: 'None',
      primaryExpiryCandidate: null,
      primaryMfgCandidate: null,
      warnings: [...warnings, 'No manufacturing or expiry dates could be detected in this image. Manual entry is required.'],
      requiresUserConfirmation: true
    };
  }

  // Group candidates by type
  const expCandidates = candidates.filter(c => c.type === 'exp');
  const mfgCandidates = candidates.filter(c => c.type === 'mfg');
  const unknownCandidates = candidates.filter(c => c.type === 'unknown');

  let primaryExpiryCandidate = expCandidates[0] || null;
  let primaryMfgCandidate = mfgCandidates[0] || null;

  // 3. Check for conflicting expiry dates
  // If multiple distinct dates are labeled as EXP
  let hasConflictingDates = false;
  if (expCandidates.length > 1) {
    const dates = expCandidates.map(c => c.parsedDate.toISOString().substring(0, 10));
    const uniqueDates = new Set(dates);
    if (uniqueDates.size > 1) {
      hasConflictingDates = true;
      warnings.push(`Multiple conflicting expiry dates found on label: ${Array.from(uniqueDates).join(', ')}.`);
    }
  }

  // If no exp candidate found, check unknown candidates if any
  if (!primaryExpiryCandidate && unknownCandidates.length > 0) {
    // If only one unknown candidate exists and no mfg candidate, suggest it as potential expiry
    if (unknownCandidates.length === 1 && !primaryMfgCandidate) {
      primaryExpiryCandidate = unknownCandidates[0];
      warnings.push('Date detected without explicit "EXP" prefix. Please verify whether this is an expiry date.');
    } else if (unknownCandidates.length >= 2) {
      hasConflictingDates = true;
      warnings.push('Multiple unlabelled dates detected. Please assign which date is MFG vs EXP.');
    }
  }

  // Ambiguity check
  if (primaryExpiryCandidate?.isAmbiguous) {
    warnings.push(
      `Ambiguous date format: "${primaryExpiryCandidate.rawText}" could mean ${primaryExpiryCandidate.day}/${primaryExpiryCandidate.month} or ${primaryExpiryCandidate.month}/${primaryExpiryCandidate.day}.`
    );
  }

  // Date sequence consistency check: Expiry cannot precede Manufacturing date
  if (primaryExpiryCandidate?.parsedDate && primaryMfgCandidate?.parsedDate) {
    if (new Date(primaryExpiryCandidate.parsedDate).getTime() < new Date(primaryMfgCandidate.parsedDate).getTime()) {
      hasConflictingDates = true;
      warnings.push('Date sequence mismatch: Extracted expiry date is earlier than manufacturing date. Please verify the label.');
    }
  }

  // Shelf-life consistency check
  let calculatedExpiry = null;
  if (primaryMfgCandidate && shelfLife) {
    calculatedExpiry = calculateShelfLifeDeadline(primaryMfgCandidate.parsedDate, shelfLife.months);
    if (primaryExpiryCandidate && calculatedExpiry) {
      const discrepancy = checkExpiryDiscrepancy(primaryExpiryCandidate.parsedDate, calculatedExpiry);
      if (discrepancy?.hasDiscrepancy) {
        warnings.push(discrepancy.message);
      }
    }
  }

  // Determine final status
  let status = 'needs_verification';
  let statusLabel = 'Needs Verification';
  let confidenceLevel = 'Moderate';

  if (hasConflictingDates) {
    status = 'conflicting_dates';
    statusLabel = 'Conflicting Dates';
    confidenceLevel = 'Low';
  } else if (
    primaryExpiryCandidate &&
    !primaryExpiryCandidate.isAmbiguous &&
    ocrResult.confidence >= 75 &&
    imageQuality.overallRating === 'good' &&
    warnings.length === 0
  ) {
    status = 'clear_candidate';
    statusLabel = 'Clear Candidate';
    confidenceLevel = 'High';
  }

  return {
    status,
    statusLabel,
    confidenceLevel,
    primaryExpiryCandidate,
    primaryMfgCandidate,
    calculatedExpiry,
    shelfLife,
    pao,
    warnings,
    requiresUserConfirmation: true // User must always confirm per core safety rule!
  };
}
