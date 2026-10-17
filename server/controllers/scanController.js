import path from 'path';
import { ScanHistory } from '../models/ScanHistory.js';
import { Product } from '../models/Product.js';
import { analyzeImageQuality } from '../services/imageQualityService.js';
import { performOCR } from '../services/ocrService.js';
import { evaluateVerificationStatus } from '../services/verificationService.js';
import { calculateShelfLifeDeadline, calculateAfterOpeningDeadline } from '../services/expiryService.js';

export async function processScan(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please capture or upload a product label.'
      });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    const fullDiskPath = req.file.path;

    // 1. Analyze Image Quality with Sharp
    const imageQuality = await analyzeImageQuality(fullDiskPath);

    // 2. Perform OCR & extract candidate dates
    const ocrResult = await performOCR(fullDiskPath);

    // 3. Evaluate Verification Status & Confidence
    const verification = evaluateVerificationStatus({ imageQuality, ocrResult });

    // Prepare initial candidate values for pre-populating the UI
    const originalCandidateValues = {
      name: ocrResult.detectedName || '',
      brand: ocrResult.detectedBrand || '',
      category: ocrResult.detectedCategory || 'food_beverage',
      manufacturingDate: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.parsedDate : null,
      manufacturingDatePrecision: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.precision : 'unknown',
      manufacturingDateRaw: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.rawText : '',
      printedExpiryDate: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.parsedDate : null,
      printedExpiryDatePrecision: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.precision : 'unknown',
      printedExpiryDateRaw: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.rawText : '',
      isExpiryCalculated: Boolean(verification.primaryExpiryCandidate?.isCalculated),
      shelfLifeMonths: ocrResult.shelfLife ? ocrResult.shelfLife.months : null,
      shelfLifeDuration: ocrResult.shelfLife ? ocrResult.shelfLife.raw : '',
      afterOpeningDurationMonths: ocrResult.pao ? ocrResult.pao.months : null,
      notes: ocrResult.storageInstructions || ''
    };

    // 4. Save ScanHistory record (immutable original OCR record)
    const scanRecord = await ScanHistory.create({
      userId: req.user._id,
      originalImagePath: imagePath,
      originalOcrText: ocrResult.text,
      extractedDateCandidates: ocrResult.candidates.map(c => ({
        text: c.rawText,
        parsedDate: c.parsedDate,
        precision: c.precision,
        type: c.type,
        confidence: c.confidence,
        context: c.context
      })),
      ocrConfidence: ocrResult.confidence,
      imageQuality,
      originalCandidateValues,
      verificationStatus: verification.status,
      scanTimestamp: new Date()
    });

    res.status(200).json({
      success: true,
      scanId: scanRecord._id,
      imagePath,
      imageQuality,
      ocrConfidence: ocrResult.confidence,
      ocrText: ocrResult.text,
      candidates: ocrResult.candidates,
      shelfLife: ocrResult.shelfLife,
      pao: ocrResult.pao,
      verification,
      candidateValues: originalCandidateValues
    });
  } catch (err) {
    next(err);
  }
}

export async function getScanById(req, res, next) {
  try {
    const scan = await ScanHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan record not found.'
      });
    }

    res.status(200).json({
      success: true,
      scan
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmScan(req, res, next) {
  try {
    const {
      name,
      category,
      brand,
      manufacturingDate,
      manufacturingDatePrecision = 'unknown',
      printedExpiryDate,
      printedExpiryDatePrecision = 'unknown',
      shelfLifeMonths,
      shelfLifeDuration,
      openedAt,
      afterOpeningDurationMonths,
      notes
    } = req.body;

    const scan = await ScanHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan record not found.'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required for confirmation.'
      });
    }

    // Calculate shelf-life expiry if manufacturingDate and shelfLifeMonths exist
    let calculatedExpiryDate = null;
    let calculatedExpiryDatePrecision = 'unknown';
    if (manufacturingDate && shelfLifeMonths && Number(shelfLifeMonths) > 0) {
      calculatedExpiryDate = calculateShelfLifeDeadline(new Date(manufacturingDate), Number(shelfLifeMonths));
      calculatedExpiryDatePrecision = manufacturingDatePrecision;
    }

    // Calculate after-opening deadline if opened
    let afterOpeningDeadline = null;
    let afterOpeningDeadlinePrecision = 'unknown';
    if (openedAt && afterOpeningDurationMonths && Number(afterOpeningDurationMonths) > 0) {
      afterOpeningDeadline = calculateAfterOpeningDeadline(new Date(openedAt), Number(afterOpeningDurationMonths));
      afterOpeningDeadlinePrecision = 'day';
    }

    // Log differences between initial OCR candidates and user confirmed values
    const originalCandidates = scan.originalCandidateValues || {};
    const corrections = [];

    const fieldsToCheck = [
      'name', 'brand', 'printedExpiryDate', 'manufacturingDate', 'shelfLifeMonths'
    ];

    fieldsToCheck.forEach(field => {
      const orig = originalCandidates[field];
      const conf = req.body[field];
      if (orig !== undefined && conf !== undefined && String(orig || '') !== String(conf || '')) {
        corrections.push({
          field,
          fromValue: orig,
          toValue: conf,
          reason: 'User modified OCR candidate before confirmation',
          timestamp: new Date()
        });
      }
    });

    // Determine date source
    let dateSource = 'manual';
    if (printedExpiryDate) {
      dateSource = 'ocr_printed';
    } else if (calculatedExpiryDate) {
      dateSource = 'ocr_calculated';
    }

    // Create the confirmed product in inventory
    const product = await Product.create({
      userId: req.user._id,
      name: name.trim(),
      category: category || 'food_beverage',
      brand: brand ? brand.trim() : '',
      imagePath: scan.originalImagePath,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      manufacturingDatePrecision,
      printedExpiryDate: printedExpiryDate ? new Date(printedExpiryDate) : null,
      printedExpiryDatePrecision,
      calculatedExpiryDate,
      calculatedExpiryDatePrecision,
      shelfLifeMonths: shelfLifeMonths ? Number(shelfLifeMonths) : null,
      shelfLifeDuration: shelfLifeDuration || '',
      openedAt: openedAt ? new Date(openedAt) : null,
      afterOpeningDurationMonths: afterOpeningDurationMonths ? Number(afterOpeningDurationMonths) : null,
      afterOpeningDeadline,
      afterOpeningDeadlinePrecision,
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource,
      notes: notes || ''
    });

    // Update scan history record with confirmation details
    scan.productId = product._id;
    scan.confirmedValues = product.toObject();
    scan.verificationStatus = 'confirmed';
    if (corrections.length > 0) {
      scan.correctionDetails.push(...corrections);
    }
    await scan.save();

    res.status(200).json({
      success: true,
      message: 'Product details successfully confirmed and added to inventory.',
      product,
      scanId: scan._id
    });
  } catch (err) {
    next(err);
  }
}

export async function rescan(req, res, next) {
  try {
    const scan = await ScanHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan record not found.'
      });
    }

    let imagePath = scan.originalImagePath;
    let fullDiskPath = null;

    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      fullDiskPath = req.file.path;
      scan.originalImagePath = imagePath;
    } else if (scan.originalImagePath) {
      fullDiskPath = path.resolve('uploads', path.basename(scan.originalImagePath));
    }

    if (!fullDiskPath) {
      return res.status(400).json({
        success: false,
        message: 'No image available for rescanning. Please upload a label photo.'
      });
    }

    const imageQuality = await analyzeImageQuality(fullDiskPath);
    const ocrResult = await performOCR(fullDiskPath);
    const verification = evaluateVerificationStatus({ imageQuality, ocrResult });

    const newCandidateValues = {
      name: ocrResult.detectedName || scan.originalCandidateValues?.name || '',
      brand: ocrResult.detectedBrand || scan.originalCandidateValues?.brand || '',
      category: ocrResult.detectedCategory || scan.originalCandidateValues?.category || 'food_beverage',
      manufacturingDate: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.parsedDate : null,
      manufacturingDatePrecision: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.precision : 'unknown',
      manufacturingDateRaw: verification.primaryMfgCandidate ? verification.primaryMfgCandidate.rawText : '',
      printedExpiryDate: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.parsedDate : null,
      printedExpiryDatePrecision: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.precision : 'unknown',
      printedExpiryDateRaw: verification.primaryExpiryCandidate ? verification.primaryExpiryCandidate.rawText : '',
      isExpiryCalculated: Boolean(verification.primaryExpiryCandidate?.isCalculated),
      shelfLifeMonths: ocrResult.shelfLife ? ocrResult.shelfLife.months : null,
      shelfLifeDuration: ocrResult.shelfLife ? ocrResult.shelfLife.raw : '',
      afterOpeningDurationMonths: ocrResult.pao ? ocrResult.pao.months : null,
      notes: ocrResult.storageInstructions || scan.originalCandidateValues?.notes || ''
    };

    scan.originalOcrText = ocrResult.text;
    scan.extractedDateCandidates = ocrResult.candidates.map(c => ({
      text: c.rawText,
      parsedDate: c.parsedDate,
      precision: c.precision,
      type: c.type,
      confidence: c.confidence,
      context: c.context
    }));
    scan.ocrConfidence = ocrResult.confidence;
    scan.imageQuality = imageQuality;
    scan.originalCandidateValues = newCandidateValues;
    scan.verificationStatus = verification.status;
    scan.correctionDetails.push({
      field: 'rescan',
      fromValue: null,
      toValue: new Date(),
      reason: 'User triggered rescan of product image',
      timestamp: new Date()
    });

    await scan.save();

    res.status(200).json({
      success: true,
      message: 'Rescan completed successfully.',
      scanId: scan._id,
      imagePath,
      imageQuality,
      ocrConfidence: ocrResult.confidence,
      ocrText: ocrResult.text,
      candidates: ocrResult.candidates,
      shelfLife: ocrResult.shelfLife,
      pao: ocrResult.pao,
      verification,
      candidateValues: newCandidateValues
    });
  } catch (err) {
    next(err);
  }
}

