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

      case 'color_enhanced':
        // For white/light typography printed on colored or circular substrates (e.g. terracotta, pink, gold)
        return await pipeline
          .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.5 })
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
 * Detects candidate label regions and crops in an image.
 * Separates foreground product labels from background desks, screens, and keyboards.
 * @param {string|Buffer} filePathOrBuffer
 * @returns {Promise<Array<{name: string, left: number, top: number, width: number, height: number}>>}
 */
export async function detectLabelCrops(filePathOrBuffer) {
  try {
    const meta = await sharp(filePathOrBuffer).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    const crops = [];

    // 1. Full image crop
    crops.push({
      name: 'full_image',
      left: 0,
      top: 0,
      width,
      height
    });

    // If image has enough dimensions, add smart label subcrops
    if (width >= 200 && height >= 200) {
      // 2. Focused center foreground crop
      // Handheld products or items photographed on a table/desk/keyboard have the product in center
      // This cuts off background monitors, screen bezels, and laptop keyboards
      const focusedW = Math.round(width * 0.70);
      const focusedH = Math.round(height * 0.48);
      crops.push({
        name: 'focused_center',
        left: Math.round(width * 0.15),
        top: Math.round(height * 0.22),
        width: Math.min(width, focusedW),
        height: Math.min(height, focusedH)
      });

      // 3. Inner core / circular label crop
      // For bottle caps, jars, lipstick ends, or small circular stickers
      const side = Math.round(Math.min(width * 0.44, height * 0.32));
      crops.push({
        name: 'inner_core_circle',
        left: Math.round(width * 0.23),
        top: Math.round(height * 0.29),
        width: side,
        height: side
      });
    }

    return crops;
  } catch (err) {
    console.error('[Preprocessing] Error detecting label crops:', err.message);
    return [{ name: 'full_image', left: 0, top: 0, width: 0, height: 0 }];
  }
}

/**
 * Extracts and enhances a specific label crop.
 * Upscales small circular or curved labels to optimal OCR resolution with Lanczos3.
 * @param {string|Buffer} filePathOrBuffer
 * @param {{left: number, top: number, width: number, height: number}} cropDef
 * @param {string} variant ('standard' | 'color_enhanced' | 'high_contrast' | 'rotate10')
 */
export async function getCropBuffer(filePathOrBuffer, cropDef, variant = 'standard') {
  try {
    let pipeline = sharp(filePathOrBuffer).rotate();

    // If crop is not full image, extract the bounding box
    if (cropDef.width > 0 && cropDef.height > 0) {
      pipeline = pipeline.extract({
        left: cropDef.left,
        top: cropDef.top,
        width: cropDef.width,
        height: cropDef.height
      });
    }

    // Adaptive upscale for small crops
    const targetW = Math.max(900, Math.min(1200, cropDef.width * 2));
    pipeline = pipeline.resize({
      width: targetW,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3
    });

    switch (variant) {
      case 'color_enhanced':
        return await pipeline
          .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.5 })
          .toFormat('png')
          .toBuffer();

      case 'high_contrast':
        return await pipeline
          .grayscale()
          .median(3)
          .linear(1.3, -20)
          .toFormat('png')
          .toBuffer();

      case 'rotate10':
        return await pipeline
          .rotate(10, { background: '#ffffff' })
          .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.5 })
          .toFormat('png')
          .toBuffer();

      case 'standard':
      default:
        return await pipeline
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.0 })
          .toFormat('png')
          .toBuffer();
    }
  } catch (err) {
    console.error('[Preprocessing] Error getting crop buffer:', err.message);
    return null;
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
