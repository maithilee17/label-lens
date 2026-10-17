import path from 'path';
import { performOCR, terminateOCRWorker } from '../services/ocrService.js';
import { evaluateVerificationStatus } from '../services/verificationService.js';
import { computeExpiryStatus, getApplicableDeadline } from '../services/expiryService.js';

describe('Cosmetic Product OCR & Multi-Label Regression Tests', () => {
  afterAll(async () => {
    await terminateOCRWorker();
  });

  const lipbalmPath = path.resolve('..', 'images', 'lipbalm.jfif');
  const milkPath = path.resolve('..', 'images', 'milk.png');

  describe('Supplied Cosmetic Label Image (lipbalm.jfif)', () => {
    test('extracts all expected fields from the circular cosmetic product label', async () => {
      const ocrResult = await performOCR(lipbalmPath);

      // 1. Rejects keyboard noise: Product name must NEVER be 'SONY'
      expect(ocrResult.detectedName).not.toBe('SONY');
      expect(ocrResult.detectedBrand).not.toBe('SONY');
      expect(ocrResult.text.toLowerCase()).not.toContain('sony');

      // 2. Inferred Category: Must be makeup_cosmetics, NEVER food_beverage
      expect(ocrResult.detectedCategory).toBe('makeup_cosmetics');

      // 3. Brand / Manufacturer: Viva Cosmetics
      expect(ocrResult.detectedBrand).toBe('Viva Cosmetics');

      // 4. Product Name: Berry Crumble lipstick
      expect(ocrResult.detectedName).toContain('Berry Crumble');

      // 5. Batch Number: B0415
      expect(ocrResult.batchNumber).toBe('B0415');

      // 6. Extracted Dates: MFG (12/25) and Use-Before/EXP (11/27)
      expect(ocrResult.candidates.length).toBeGreaterThanOrEqual(2);

      const mfg = ocrResult.candidates.find(c => c.type === 'mfg');
      const exp = ocrResult.candidates.find(c => c.type === 'exp');

      expect(mfg).toBeDefined();
      expect(mfg.rawText).toBe('12/25');
      expect(mfg.month).toBe(12);
      expect(mfg.year).toBe(2025);
      expect(mfg.precision).toBe('month');
      expect(mfg.day).toBeNull(); // Day must not be fabricated!

      expect(exp).toBeDefined();
      expect(exp.rawText).toBe('11/27');
      expect(exp.month).toBe(11);
      expect(exp.year).toBe(2027);
      expect(exp.precision).toBe('month');
      expect(exp.day).toBeNull(); // Day must not be fabricated!

      // 7. Verification Status Evaluation
      const verification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'acceptable' },
        ocrResult
      });

      expect(verification.primaryMfgCandidate).not.toBeNull();
      expect(verification.primaryExpiryCandidate).not.toBeNull();
      expect(verification.primaryExpiryCandidate.precision).toBe('month');
    }, 40000);
  });

  describe('Food & Beverage Label Image (milk.png)', () => {
    test('extracts expected fields from commercial food carton label', async () => {
      const ocrResult = await performOCR(milkPath);

      expect(ocrResult.detectedCategory).toBe('food_beverage');
      expect(ocrResult.detectedBrand).toBe('Fresh');
      expect(ocrResult.detectedName).toBe('Milk');

      const mfg = ocrResult.candidates.find(c => c.type === 'mfg');
      const exp = ocrResult.candidates.find(c => c.type === 'exp');

      expect(mfg).toBeDefined();
      expect(mfg.year).toBe(2024);
      expect(mfg.month).toBe(6);
      expect(mfg.day).toBe(12);
      expect(mfg.precision).toBe('day');

      expect(exp).toBeDefined();
      expect(exp.year).toBe(2024);
      expect(exp.month).toBe(7);
      expect(exp.day).toBe(12);
      expect(exp.precision).toBe('day');
    }, 20000);
  });

  describe('Unreadable Images and Labels Without Dates', () => {
    test('marks unreadable/unusable image with clear retake message', () => {
      const unusableVerification = evaluateVerificationStatus({
        imageQuality: {
          overallRating: 'poor',
          isBlurry: true,
          warnings: ['Image is out of focus']
        },
        ocrResult: {
          confidence: 10,
          text: '....',
          candidates: []
        }
      });

      expect(unusableVerification.status).toBe('unusable_image');
      expect(unusableVerification.statusLabel).toBe('Unreadable Label');
      expect(unusableVerification.warnings.some(w => w.includes('sharper, well-lit, close-up image'))).toBe(true);
    });

    test('marks acceptable image without dates as no_date_found without inventing dates', () => {
      const noDateVerification = evaluateVerificationStatus({
        imageQuality: { overallRating: 'good', warnings: [] },
        ocrResult: {
          confidence: 85,
          text: 'Viva Cosmetics Velvet Pouch. Made in India',
          candidates: []
        }
      });

      expect(noDateVerification.status).toBe('no_date_found');
      expect(noDateVerification.primaryExpiryCandidate).toBeNull();
      expect(noDateVerification.primaryMfgCandidate).toBeNull();
    });
  });

  describe('Month/Year Precision Expiry Calculations & Reminders', () => {
    test('calculates applicable deadline to month end for month precision dates', () => {
      const product = {
        name: 'Berry Crumble lipstick',
        printedExpiryDate: new Date('2027-11-30T00:00:00.000Z'),
        printedExpiryDatePrecision: 'month'
      };

      const deadline = getApplicableDeadline(product);
      expect(deadline).not.toBeNull();
      expect(deadline.date.getUTCFullYear()).toBe(2027);
      expect(deadline.date.getUTCMonth()).toBe(10); // November (0-indexed 10)
      expect(deadline.date.getUTCDate()).toBe(30); // Last day of November

      const statusIn2027 = computeExpiryStatus(product, new Date('2027-11-01T00:00:00.000Z'));
      expect(statusIn2027).toBe('fresh');

      const statusExpired = computeExpiryStatus(product, new Date('2027-12-01T00:00:00.000Z'));
      expect(statusExpired).toBe('expired');
    });
  });
});
