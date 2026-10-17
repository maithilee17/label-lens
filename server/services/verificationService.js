/**
 * Verification Service for LabelLens
 * Evaluates OCR results, image quality, and date candidate validity
 * to assign an honest verification status, calculate shelf-life deadlines,
 * and surface actionable warnings without dropping readable information.
 */

import { checkExpiryDiscrepancy, calculateShelfLifeDeadline } from './expiryService.js';

export function evaluateVerificationStatus({ imageQuality = {}, ocrResult = {} }) {
  const warnings = [...(imageQuality.warnings || [])];
  const candidates = ocrResult.candidates || [];
  const shelfLife = ocrResult.shelfLife || null;
  const pao = ocrResult.pao || null;

  // Group candidates by type
  const expCandidates = candidates.filter(c => c.type === 'exp');
  const mfgCandidates = candidates.filter(c => c.type === 'mfg');
  const unknownCandidates = candidates.filter(c => c.type === 'unknown');

  let primaryExpiryCandidate = expCandidates[0] || null;
  let primaryMfgCandidate = mfgCandidates[0] || null;

  // If no exp candidate found, check unknown candidates
  if (!primaryExpiryCandidate && unknownCandidates.length > 0) {
    if (unknownCandidates.length === 1 && !primaryMfgCandidate) {
      primaryExpiryCandidate = unknownCandidates[0];
      warnings.push('Date detected without explicit "EXP" prefix. Please verify whether this is an expiry date.');
    } else if (unknownCandidates.length >= 2) {
      warnings.push('Multiple unlabeled dates detected. Please verify which is MFG vs EXP.');
    }
  }

  // 1. Unusable Image Check (no readable text AND no dates found)
  if (candidates.length === 0 && !shelfLife && !pao) {
    const isVeryPoorQuality = imageQuality.overallRating === 'poor' || (ocrResult.confidence < 25 && (!ocrResult.text || ocrResult.text.length < 15));
    if (isVeryPoorQuality) {
      return {
        status: 'unusable_image',
        statusLabel: 'Unreadable Label',
        confidenceLevel: 'None',
        primaryExpiryCandidate: null,
        primaryMfgCandidate: null,
        calculatedExpiry: null,
        shelfLife: null,
        pao: null,
        warnings: [
          ...warnings,
          "We couldn't read the product label clearly. Please upload a sharper, well-lit, close-up image with the text in focus, or enter product details manually."
        ],
        requiresUserConfirmation: true
      };
    }

    return {
      status: 'no_date_found',
      statusLabel: 'No Date Found',
      confidenceLevel: 'None',
      primaryExpiryCandidate: null,
      primaryMfgCandidate: null,
      calculatedExpiry: null,
      shelfLife: null,
      pao: null,
      warnings: [...warnings, 'No manufacturing or expiry dates could be detected. Manual entry is required.'],
      requiresUserConfirmation: true
    };
  }

  // 2. Usable but Imperfect Image (Low Quality, but OCR found readable candidates!)
  // In accordance with guidelines: do NOT discard candidates solely because overallRating === 'poor'
  let hasLowQualityWarning = false;
  if (imageQuality.overallRating === 'poor' || imageQuality.isBlurry || imageQuality.isLowResolution) {
    hasLowQualityWarning = true;
    warnings.push('Image quality was imperfect. Extracted values should be carefully reviewed against the physical package.');
  }

  // 3. Check for conflicting expiry dates
  let hasConflictingDates = false;
  if (expCandidates.length > 1) {
    const dates = expCandidates.map(c => c.parsedDate.toISOString().substring(0, 10));
    const uniqueDates = new Set(dates);
    if (uniqueDates.size > 1) {
      hasConflictingDates = true;
      warnings.push(`Multiple conflicting expiry dates found on label: ${Array.from(uniqueDates).join(', ')}.`);
    }
  }

  // 4. Ambiguity check
  if (primaryExpiryCandidate?.isAmbiguous) {
    warnings.push(
      `Ambiguous date format: "${primaryExpiryCandidate.rawText}" could mean ${primaryExpiryCandidate.day}/${primaryExpiryCandidate.month} or ${primaryExpiryCandidate.month}/${primaryExpiryCandidate.day}.`
    );
  }

  // 5. Sequence consistency: Expiry cannot precede Manufacturing date
  if (primaryExpiryCandidate?.parsedDate && primaryMfgCandidate?.parsedDate) {
    if (new Date(primaryExpiryCandidate.parsedDate).getTime() < new Date(primaryMfgCandidate.parsedDate).getTime()) {
      hasConflictingDates = true;
      warnings.push('Date sequence mismatch: Extracted expiry date is earlier than manufacturing date. Please verify the label.');
    }
  }

  // 6. Shelf-life calculation
  let calculatedExpiry = null;
  if (primaryMfgCandidate && shelfLife && shelfLife.months > 0) {
    calculatedExpiry = calculateShelfLifeDeadline(primaryMfgCandidate.parsedDate, shelfLife.months);

    if (primaryExpiryCandidate && calculatedExpiry) {
      const discrepancy = checkExpiryDiscrepancy(primaryExpiryCandidate.parsedDate, calculatedExpiry);
      if (discrepancy?.hasDiscrepancy) {
        warnings.push(discrepancy.message);
      }
    } else if (!primaryExpiryCandidate && calculatedExpiry) {
      // Inferred expiry date from explicit shelf life + MFG date
      primaryExpiryCandidate = {
        parsedDate: calculatedExpiry,
        precision: primaryMfgCandidate.precision,
        rawText: `${shelfLife.raw} from MFG`,
        isCalculated: true,
        confidence: 0.85
      };
      warnings.push(`Expiry date calculated as ${shelfLife.months} months from Manufacturing Date (${primaryMfgCandidate.rawText}).`);
    }
  }

  // 7. Determine Final Verification Status
  let status = 'needs_verification';
  let statusLabel = 'Needs Verification';
  let confidenceLevel = 'Moderate';

  if (hasConflictingDates) {
    status = 'conflicting_dates';
    statusLabel = 'Conflicting Dates';
    confidenceLevel = 'Low';
  } else if (hasLowQualityWarning) {
    status = 'needs_verification';
    statusLabel = 'Low Quality - Verify';
    confidenceLevel = 'Low';
  } else if (
    primaryExpiryCandidate &&
    !primaryExpiryCandidate.isAmbiguous &&
    !primaryExpiryCandidate.isCalculated &&
    (ocrResult.confidence || 0) >= 70 &&
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
    requiresUserConfirmation: true // Core safety rule: user must review and confirm before saving!
  };
}
