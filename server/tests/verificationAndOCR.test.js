import { evaluateVerificationStatus } from '../services/verificationService.js';
import { calculateShelfLifeDeadline } from '../services/expiryService.js';

describe('Verification & OCR Evaluation Service', () => {
  describe('Usable Low-Quality Images vs Unusable Images', () => {
    test('preserves readable candidate dates even when imageQuality is poor', () => {
      const imageQuality = {
        overallRating: 'poor',
        isBlurry: true,
        warnings: ['Image appears blurry or out of focus.']
      };

      const ocrResult = {
        confidence: 68,
        text: 'EXP 10/2026',
        candidates: [
          {
            type: 'exp',
            rawText: '10/2026',
            parsedDate: new Date('2026-10-31T00:00:00Z'),
            precision: 'month',
            year: 2026,
            month: 10,
            day: null
          }
        ]
      };

      const verification = evaluateVerificationStatus({ imageQuality, ocrResult });

      // Core requirement: Do NOT null out candidates just because quality was imperfect!
      expect(verification.primaryExpiryCandidate).not.toBeNull();
      expect(verification.primaryExpiryCandidate.rawText).toBe('10/2026');
      expect(verification.status).toBe('needs_verification');
      expect(verification.warnings.some(w => w.includes('imperfect'))).toBe(true);
    });

    test('flags unusable image with clear guidance when no dates and no text are readable', () => {
      const imageQuality = {
        overallRating: 'poor',
        isBlurry: true,
        warnings: ['Severe blur detected']
      };

      const ocrResult = {
        confidence: 10,
        text: '.....',
        candidates: []
      };

      const verification = evaluateVerificationStatus({ imageQuality, ocrResult });

      expect(verification.status).toBe('unusable_image');
      expect(verification.statusLabel).toBe('Unreadable Label');
      expect(verification.primaryExpiryCandidate).toBeNull();
      expect(verification.warnings.some(w => w.includes('sharper, well-lit, close-up image'))).toBe(true);
    });

    test('flags no_date_found when image quality is acceptable but label has no expiry dates', () => {
      const imageQuality = {
        overallRating: 'good',
        warnings: []
      };

      const ocrResult = {
        confidence: 85,
        text: 'Organic Cotton Shirt. Size L. Made in India',
        candidates: []
      };

      const verification = evaluateVerificationStatus({ imageQuality, ocrResult });

      expect(verification.status).toBe('no_date_found');
      expect(verification.statusLabel).toBe('No Date Found');
      expect(verification.primaryExpiryCandidate).toBeNull();
    });
  });

  describe('Shelf-Life Calculation from Manufacturing Date', () => {
    test('calculates expiry date when MFG date and shelf life are explicitly available and no printed EXP exists', () => {
      const mfgDate = new Date('2024-05-15T00:00:00Z');
      const ocrResult = {
        confidence: 80,
        text: 'MFG: 15/05/2024. Best before 24 months from manufacture date',
        shelfLife: { months: 24, raw: '24 months' },
        candidates: [
          {
            type: 'mfg',
            rawText: '15/05/2024',
            parsedDate: mfgDate,
            precision: 'day',
            year: 2024,
            month: 5,
            day: 15
          }
        ]
      };

      const verification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'good' },
        ocrResult
      });

      expect(verification.calculatedExpiry).toBeDefined();
      expect(verification.primaryExpiryCandidate).toBeDefined();
      expect(verification.primaryExpiryCandidate.isCalculated).toBe(true);
      expect(new Date(verification.primaryExpiryCandidate.parsedDate).getUTCFullYear()).toBe(2026);
      expect(new Date(verification.primaryExpiryCandidate.parsedDate).getUTCMonth()).toBe(4); // May (0-indexed 4)
    });

    test('warns when printed expiry date conflicts with calculated shelf-life deadline', () => {
      const mfgDate = new Date('2024-01-01T00:00:00Z');
      const printedExpDate = new Date('2027-01-01T00:00:00Z'); // 36 months later
      const ocrResult = {
        confidence: 85,
        text: 'MFG: 01/01/2024 EXP: 01/01/2027 Shelf life 12 months',
        shelfLife: { months: 12, raw: '12 months' },
        candidates: [
          { type: 'mfg', rawText: '01/01/2024', parsedDate: mfgDate, precision: 'day' },
          { type: 'exp', rawText: '01/01/2027', parsedDate: printedExpDate, precision: 'day' }
        ]
      };

      const verification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'good' },
        ocrResult
      });

      // Discrepancy between printed EXP (36m) and shelf-life rule (12m) should generate warning
      expect(verification.warnings.some(w => w.toLowerCase().includes('shelf-life') || w.toLowerCase().includes('differ') || w.toLowerCase().includes('discrepancy'))).toBe(true);
    });
  });

  describe('Date Sequence and Conflicting Dates Detection', () => {
    test('flags conflicting_dates if multiple distinct dates are labeled as EXP', () => {
      const ocrResult = {
        confidence: 75,
        candidates: [
          { type: 'exp', rawText: '10/2026', parsedDate: new Date('2026-10-31T00:00:00Z'), precision: 'month' },
          { type: 'exp', rawText: '12/2027', parsedDate: new Date('2027-12-31T00:00:00Z'), precision: 'month' }
        ]
      };

      const verification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'good' },
        ocrResult
      });

      expect(verification.status).toBe('conflicting_dates');
      expect(verification.warnings.some(w => w.includes('conflicting'))).toBe(true);
    });

    test('flags sequence mismatch if extracted expiry date is earlier than manufacturing date', () => {
      const ocrResult = {
        confidence: 80,
        candidates: [
          { type: 'mfg', rawText: '2026-10-15', parsedDate: new Date('2026-10-15T00:00:00Z'), precision: 'day' },
          { type: 'exp', rawText: '2024-10-15', parsedDate: new Date('2024-10-15T00:00:00Z'), precision: 'day' }
        ]
      };

      const verification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'good' },
        ocrResult
      });

      expect(verification.status).toBe('conflicting_dates');
      expect(verification.warnings.some(w => w.includes('earlier than manufacturing date'))).toBe(true);
    });
  });
});
