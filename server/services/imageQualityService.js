/**
 * Image Quality Analysis Service using Sharp
 * Computes blur variance (via Laplacian kernel), brightness, contrast, and resolution.
 */

import sharp from 'sharp';

export async function analyzeImageQuality(filePathOrBuffer) {
  try {
    const image = sharp(filePathOrBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions or invalid image format.');
    }

    const { width, height, format } = metadata;

    // Supported formats
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'heif'];
    if (!validFormats.includes(format?.toLowerCase())) {
      return {
        isValid: false,
        error: `Unsupported image format: ${format}. Please use JPEG, PNG, or WebP.`,
        overallRating: 'poor',
        warnings: ['Unsupported image format']
      };
    }

    // 1. Resolution Check
    const isLowResolution = width < 300 || height < 300;
    const isMediumResolution = width >= 300 && width < 600;

    // 2. Grayscale raw buffer for brightness & contrast analysis
    // Resize down to 256x256 for fast, stable statistical computation
    const { data: grayData, info: grayInfo } = await sharp(filePathOrBuffer)
      .resize(256, 256, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    let sumSq = 0;
    const n = grayData.length;

    for (let i = 0; i < n; i++) {
      const v = grayData[i];
      sum += v;
      sumSq += v * v;
    }

    const mean = sum / n; // 0 to 255
    const variance = (sumSq / n) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance)); // Contrast metric

    const isDark = mean < 50;
    const isOverexposed = mean > 215;
    const isLowContrast = stdDev < 25;

    // 3. Blur detection using Laplacian high-frequency edge response
    // Convolve with standard 3x3 discrete Laplacian filter
    const laplacianKernel = {
      width: 3,
      height: 3,
      kernel: [
        0,  1, 0,
        1, -4, 1,
        0,  1, 0
      ]
    };

    const { data: edgeData } = await sharp(filePathOrBuffer)
      .resize(256, 256, { fit: 'fill' })
      .grayscale()
      .convolve(laplacianKernel)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let edgeSum = 0;
    let edgeSumSq = 0;
    const edgeCount = edgeData.length;

    for (let i = 0; i < edgeCount; i++) {
      const ev = edgeData[i];
      edgeSum += ev;
      edgeSumSq += ev * ev;
    }

    const edgeMean = edgeSum / edgeCount;
    const edgeVariance = Math.max(0, (edgeSumSq / edgeCount) - (edgeMean * edgeMean));
    // Calibrated heuristic: edgeVariance < 12 usually signifies noticeable motion or focus blur
    const isBlurry = edgeVariance < 12;

    // Build warnings and overall assessment
    const warnings = [];
    if (isLowResolution) {
      warnings.push(`Low resolution (${width}x${height}). Recommend at least 600x600 for sharp text.`);
    } else if (isMediumResolution) {
      warnings.push(`Moderate resolution (${width}x${height}). Text may require verification.`);
    }

    if (isBlurry) {
      warnings.push('Image appears blurry or out of focus. Hold the camera steady and re-focus.');
    }

    if (isDark) {
      warnings.push('Image is dark or underexposed. Increase lighting or use a flashlight.');
    } else if (isOverexposed) {
      warnings.push('Image has severe glare or overexposure. Avoid direct flash reflections.');
    }

    if (isLowContrast) {
      warnings.push('Low contrast between text and background.');
    }

    let overallRating = 'good';
    if (isLowResolution || (isBlurry && (isDark || isOverexposed))) {
      overallRating = 'poor';
    } else if (isBlurry || isDark || isOverexposed || isLowContrast) {
      overallRating = 'acceptable';
    }

    return {
      isValid: true,
      width,
      height,
      format,
      brightness: Math.round(mean),
      contrast: Math.round(stdDev),
      blurScore: Math.round(edgeVariance * 10) / 10,
      isBlurry,
      isDark,
      isOverexposed,
      isLowContrast,
      isLowResolution,
      overallRating,
      warnings,
      actionableTips: warnings.length > 0
        ? warnings.join(' ')
        : 'Image quality is optimal for OCR detection.'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Image validation failed: ${err.message}`,
      overallRating: 'poor',
      warnings: ['Unable to process image file.']
    };
  }
}
