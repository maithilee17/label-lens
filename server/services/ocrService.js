/**
 * OCR Service using Tesseract.js
 * Preprocesses images, runs optical character recognition,
 * calculates confidence metrics, and delegates to dateParser.
 */

import { createWorker } from 'tesseract.js';
import { preprocessForOCR } from './imagePreprocessingService.js';
import { extractDateCandidates, parseShelfLife, parsePAO } from './dateParser.js';

let workerInstance = null;

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
  }
  return workerInstance;
}

export async function performOCR(imagePathOrBuffer) {
  try {
    // 1. Preprocess image for OCR optimization
    const preprocessedBuffer = await preprocessForOCR(imagePathOrBuffer);

    // 2. Run Tesseract Worker
    const worker = await getWorker();
    const ret = await worker.recognize(preprocessedBuffer);

    const fullText = ret.data.text || '';
    const confidence = Math.round(ret.data.confidence || 0);

    // 3. Extract dates & shelf life
    const candidates = extractDateCandidates(fullText);
    const shelfLife = parseShelfLife(fullText);
    const pao = parsePAO(fullText);

    // 4. Extract possible product name & brand heuristics from top lines
    const lines = fullText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !/^\d+$/.test(l));

    let detectedName = '';
    let detectedBrand = '';

    if (lines.length > 0) {
      // Often the first prominent non-date line is the brand or product name
      const candidateLines = lines.slice(0, 4);
      if (candidateLines.length >= 2) {
        detectedBrand = candidateLines[0].substring(0, 50);
        detectedName = candidateLines[1].substring(0, 80);
      } else {
        detectedName = candidateLines[0].substring(0, 80);
      }
    }

    return {
      text: fullText,
      confidence,
      candidates,
      shelfLife,
      pao,
      detectedName,
      detectedBrand,
      linesCount: lines.length
    };
  } catch (err) {
    console.error('[OCR Service] Recognition error:', err.message);
    return {
      text: '',
      confidence: 0,
      candidates: [],
      shelfLife: null,
      pao: null,
      detectedName: '',
      detectedBrand: '',
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
