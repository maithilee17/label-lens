/**
 * Image Preprocessing Service for OCR
 * Performs EXIF orientation correction, adaptive resolution scaling,
 * intelligent contrast enhancement, noise reduction, and variant generation
 * to maximize Tesseract OCR character accuracy for product labels.
 *
 * NOTE: The original uploaded file is never modified on disk. All operations
 * operate on in-memory buffers to preserve the pristine original image.
 */

import sharp from 'sharp';

/**
 * Standard optimal preprocessing pipeline:
 * 1. Auto-orient via EXIF
 * 2. Adaptive scaling:
 *    - Upscale small labels (< 1200px) so character strokes have sufficient pixel height (~30-50px)
 *    - Cap excessively large images (> 2600px) to prevent OCR slowdown while maintaining clarity
 * 3. Grayscale conversion
 * 4. Contrast normalization (stretching histogram)
 * 5. Gentle edge sharpening tailored for typography (prevents halo artifacts on dot-matrix print)
 */
export async function preprocessForOCR(filePathOrBuffer, variant = 'standard') {
  try {
    const base = sharp(filePathOrBuffer);
    const metadata = await base.metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const maxDim = Math.max(width, height);

    let pipeline = sharp(filePathOrBuffer).rotate(); // Auto-rotate via EXIF

    // 1. Adaptive Resolution Scaling
    if (maxDim > 0 && maxDim < 1200) {
      // Upscale small or low-resolution crops
      const scaleFactor = Math.min(2.5, 1800 / maxDim);
      pipeline = pipeline.resize({
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
        fit: 'inside',
        kernel: sharp.kernel.lanczos3
      });
    } else if (maxDim > 2600) {
      // Downscale huge images to a crisp 2200px to maintain speed without losing fine text
      const scaleFactor = 2200 / maxDim;
      pipeline = pipeline.resize({
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
        fit: 'inside',
        kernel: sharp.kernel.lanczos3
      });
    }

    // 2. Apply Variant-Specific Transformations
    switch (variant) {
      case 'high_contrast':
        // For dark packaging, low-contrast ink, or shadowed labels
        return await pipeline
          .grayscale()
          .median(3) // Denoise packaging texture / speckles
          .normalize() // Stretch contrast
          .linear(1.2, -10) // Boost contrast curve
          .toFormat('png')
          .toBuffer();

      case 'binarized':
        // For dot-matrix stamps or faint ink on colored substrates (bottle caps, foil)
        return await pipeline
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.5, m1: 0.5, m2: 1.0 })
          .threshold(130)
          .toFormat('png')
          .toBuffer();

      case 'denoised':
        // For noisy or grainy phone camera captures
        return await pipeline
          .grayscale()
          .median(3)
          .normalize()
          .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.0 })
          .toFormat('png')
          .toBuffer();

      case 'standard':
      default:
        // Balanced enhancement for typical commercial labels
        return await pipeline
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.0 })
          .toFormat('png')
          .toBuffer();
    }
  } catch (err) {
    console.error('[Preprocessing] Error during OCR preprocessing:', err.message);
    // Safe fallback to raw buffer
    return typeof filePathOrBuffer === 'string'
      ? await sharp(filePathOrBuffer).toBuffer()
      : filePathOrBuffer;
  }
}

/**
 * Creates a rotated buffer for sideways or upside-down labels where EXIF was missing.
 * @param {string|Buffer} filePathOrBuffer
 * @param {number} angle (90, 180, 270)
 */
export async function createRotatedVariant(filePathOrBuffer, angle = 90) {
  try {
    return await sharp(filePathOrBuffer)
      .rotate(angle)
      .grayscale()
      .normalize()
      .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.0 })
      .toFormat('png')
      .toBuffer();
  } catch (err) {
    console.error(`[Preprocessing] Error rotating image by ${angle}deg:`, err.message);
    return null;
  }
}
