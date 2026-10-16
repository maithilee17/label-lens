/**
 * Image Preprocessing Service for OCR
 * Performs EXIF orientation auto-rotation, grayscale conversion, contrast enhancement,
 * and adaptive scaling to maximize Tesseract OCR character accuracy.
 */

import sharp from 'sharp';

export async function preprocessForOCR(filePathOrBuffer) {
  try {
    const base = sharp(filePathOrBuffer);
    const metadata = await base.metadata();

    let pipeline = sharp(filePathOrBuffer)
      .rotate(); // Auto-rotate according to EXIF orientation

    // If image is too small (< 1000px on long edge), upscale moderately for better OCR
    const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
    if (maxDim > 0 && maxDim < 1000) {
      pipeline = pipeline.resize({
        width: metadata.width * 2,
        height: metadata.height * 2,
        fit: 'inside',
        kernel: sharp.kernel.lanczos3
      });
    }

    // Grayscale + normalize + mild sharpen
    const processedBuffer = await pipeline
      .grayscale()
      .normalize() // Stretch contrast
      .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 })
      .toFormat('png')
      .toBuffer();

    return processedBuffer;
  } catch (err) {
    console.error('[Preprocessing] Error during OCR preprocessing:', err.message);
    // Fallback to original buffer if preprocessing encounters an issue
    return typeof filePathOrBuffer === 'string'
      ? await sharp(filePathOrBuffer).toBuffer()
      : filePathOrBuffer;
  }
}
