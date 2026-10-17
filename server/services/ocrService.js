/**
 * OCR Service using Tesseract.js
 * Implements a controlled multi-pass recognition pipeline with preprocessing variants,
 * candidate evaluation, scoring, and intelligent field extraction.
 *
 * Adheres strictly to:
 * - Choosing OCR results based on text quality and field extraction, not raw character count.
 * - Avoiding excessive passes to keep recognition fast and responsive.
 * - Preserving fine text and combining complementary findings across variants.
 * - Never fabricating missing text or dates.
 */

import { createWorker } from 'tesseract.js';
import { preprocessForOCR, createRotatedVariant } from './imagePreprocessingService.js';
import {
  extractDateCandidates,
  parseShelfLife,
  parsePAO,
  extractStorageInstructions,
  detectCategory,
  extractBrandAndName
} from './dateParser.js';

let workerInstance = null;

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
  }
  return workerInstance;
}

/**
 * Evaluates an OCR pass result based on field detection completeness and confidence.
 */
function scorePass(result) {
  let score = 0;
  const candidates = result.candidates || [];
  const hasExp = candidates.some(c => c.type === 'exp');
  const hasMfg = candidates.some(c => c.type === 'mfg');

  if (hasExp) score += 50;
  if (hasMfg) score += 35;
  score += candidates.length * 20;

  if (result.shelfLife) score += 20;
  if (result.pao) score += 15;
  if (result.detectedName) score += 15;
  if (result.detectedBrand) score += 10;
  if (result.detectedCategory) score += 10;

  // Add normalized confidence weight (0 to 30)
  score += (result.confidence || 0) * 0.3;

  // Penalize if raw text is heavily garbled (excessive non-alphanumeric symbols)
  const nonAlpha = (result.text.match(/[^a-zA-Z0-9\s.,/:-]/g) || []).length;
  if (result.text.length > 0 && nonAlpha / result.text.length > 0.35) {
    score -= 25;
  }

  return score;
}

/**
 * Runs a single OCR pass on a preprocessed buffer.
 */
async function runSinglePass(worker, buffer) {
  try {
    const ret = await worker.recognize(buffer);
    const fullText = (ret.data.text || '').trim();
    const confidence = Math.round(ret.data.confidence || 0);

    const candidates = extractDateCandidates(fullText);
    const shelfLife = parseShelfLife(fullText);
    const pao = parsePAO(fullText);
    const storageInstructions = extractStorageInstructions(fullText);
    const detectedCategory = detectCategory(fullText);
    const { detectedBrand, detectedName } = extractBrandAndName(fullText);

    return {
      text: fullText,
      confidence,
      candidates,
      shelfLife,
      pao,
      storageInstructions,
      detectedCategory,
      detectedBrand,
      detectedName
    };
  } catch (err) {
    console.error('[OCR Service] Single pass failed:', err.message);
    return {
      text: '',
      confidence: 0,
      candidates: [],
      shelfLife: null,
      pao: null,
      storageInstructions: '',
      detectedCategory: null,
      detectedBrand: '',
      detectedName: '',
      error: err.message
    };
  }
}

/**
 * Main OCR Pipeline
 * 1. Executes Pass 1 with standard balanced preprocessing.
 * 2. If Pass 1 successfully extracts essential dates with solid confidence, completes immediately (fast path).
 * 3. If Pass 1 is uncertain or dates are missing, tries Pass 2 with adaptive contrast/binarization.
 * 4. If still unreadable, tries rotation variant (Pass 3) for sideways images.
 * 5. Merges complementary, non-conflicting detections while never replacing a high-confidence value with a lower one.
 */
export async function performOCR(imagePathOrBuffer) {
  try {
    const worker = await getWorker();

    // Pass 1: Standard Balanced Preprocessing
    const standardBuffer = await preprocessForOCR(imagePathOrBuffer, 'standard');
    const pass1 = await runSinglePass(worker, standardBuffer);
    pass1.variant = 'standard';
    pass1.score = scorePass(pass1);

    // Fast Path: If Pass 1 found expiry/mfg date candidates with good confidence, accept it!
    const hasClearDates = pass1.candidates.some(c => c.type === 'exp' || c.type === 'mfg');
    if (hasClearDates && pass1.confidence >= 65) {
      return {
        ...pass1,
        linesCount: pass1.text.split('\n').filter(Boolean).length,
        attemptsCount: 1
      };
    }

    // Pass 2: High-contrast / Binarized variant for dot-matrix stamps or dark/low-contrast packaging
    const highContrastBuffer = await preprocessForOCR(imagePathOrBuffer, 'high_contrast');
    const pass2 = await runSinglePass(worker, highContrastBuffer);
    pass2.variant = 'high_contrast';
    pass2.score = scorePass(pass2);

    let bestPass = pass2.score > pass1.score ? pass2 : pass1;

    // Pass 3: Rotation retry only if text is almost non-existent or no dates found
    let attemptsCount = 2;
    if (bestPass.candidates.length === 0 && bestPass.text.length < 30) {
      const rotatedBuffer = await createRotatedVariant(imagePathOrBuffer, 90);
      if (rotatedBuffer) {
        attemptsCount = 3;
        const pass3 = await runSinglePass(worker, rotatedBuffer);
        pass3.variant = 'rotated_90';
        pass3.score = scorePass(pass3);
        if (pass3.score > bestPass.score) {
          bestPass = pass3;
        }
      }
    }

    // Intelligent Merging:
    // If Pass 1 extracted a clean product name/brand, but Pass 2 found a faint stamped expiry date,
    // combine the non-conflicting fields into the final result.
    const secondaryPass = bestPass === pass1 ? pass2 : pass1;

    const mergedCandidates = [...bestPass.candidates];
    if (mergedCandidates.length === 0 && secondaryPass.candidates.length > 0) {
      mergedCandidates.push(...secondaryPass.candidates);
    }

    const finalDetectedName = bestPass.detectedName || secondaryPass.detectedName || '';
    const finalDetectedBrand = bestPass.detectedBrand || secondaryPass.detectedBrand || '';
    const finalDetectedCategory = bestPass.detectedCategory || secondaryPass.detectedCategory || null;
    const finalShelfLife = bestPass.shelfLife || secondaryPass.shelfLife || null;
    const finalPAO = bestPass.pao || secondaryPass.pao || null;
    const finalStorage = bestPass.storageInstructions || secondaryPass.storageInstructions || '';

    // Final consolidated text for "View Raw OCR Text"
    const consolidatedText = bestPass.text || secondaryPass.text || '';
    const consolidatedConfidence = Math.max(bestPass.confidence, secondaryPass.confidence);

    return {
      text: consolidatedText,
      confidence: consolidatedConfidence,
      candidates: mergedCandidates,
      shelfLife: finalShelfLife,
      pao: finalPAO,
      storageInstructions: finalStorage,
      detectedCategory: finalDetectedCategory,
      detectedName: finalDetectedName,
      detectedBrand: finalDetectedBrand,
      linesCount: consolidatedText.split('\n').filter(Boolean).length,
      attemptsCount,
      primaryVariant: bestPass.variant
    };
  } catch (err) {
    console.error('[OCR Service] Recognition pipeline error:', err.message);
    return {
      text: '',
      confidence: 0,
      candidates: [],
      shelfLife: null,
      pao: null,
      storageInstructions: '',
      detectedCategory: null,
      detectedName: '',
      detectedBrand: '',
      linesCount: 0,
      attemptsCount: 1,
      error: err.message
    };
  }
}

export async function terminateOCRWorker() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
