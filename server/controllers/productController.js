import { Product } from '../models/Product.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { Notification } from '../models/Notification.js';
import {
  computeExpiryStatus,
  getApplicableDeadline,
  calculateAfterOpeningDeadline,
  calculateShelfLifeDeadline
} from '../services/expiryService.js';

export async function getProducts(req, res, next) {
  try {
    const {
      category,
      lifecycleStatus = 'active',
      expiryStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    const query = { userId: req.user._id };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (lifecycleStatus && lifecycleStatus !== 'all') {
      query.lifecycleStatus = lifecycleStatus;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { brand: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const sortOptions = {};
    if (sortBy === 'expiryDate') {
      sortOptions.printedExpiryDate = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (expiryStatus && expiryStatus !== 'all') {
      const allMatching = await Product.find(query).sort(sortOptions);
      const computed = allMatching
        .map(p => {
          const obj = p.toObject();
          obj.expiryStatus = computeExpiryStatus(p);
          obj.applicableDeadline = getApplicableDeadline(p);
          return obj;
        })
        .filter(p => p.expiryStatus === expiryStatus);

      const total = computed.length;
      const paginated = computed.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        products: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      });
    }

    const total = await Product.countDocuments(query);
    const rawProducts = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const products = rawProducts.map(p => {
      const obj = p.toObject();
      obj.expiryStatus = computeExpiryStatus(p);
      obj.applicableDeadline = getApplicableDeadline(p);
      return obj;
    });

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const {
      name,
      category,
      brand,
      imagePath,
      purchaseDate,
      manufacturingDate,
      manufacturingDatePrecision = 'unknown',
      printedExpiryDate,
      printedExpiryDatePrecision = 'unknown',
      shelfLifeDuration,
      shelfLifeMonths,
      openedAt,
      afterOpeningDurationMonths,
      notes,
      scanHistoryId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.'
      });
    }

    let calculatedExpiryDate = null;
    let calculatedExpiryDatePrecision = 'unknown';

    if (manufacturingDate && shelfLifeMonths && Number(shelfLifeMonths) > 0) {
      calculatedExpiryDate = calculateShelfLifeDeadline(new Date(manufacturingDate), Number(shelfLifeMonths));
      calculatedExpiryDatePrecision = manufacturingDatePrecision;
    }

    let afterOpeningDeadline = null;
    let afterOpeningDeadlinePrecision = 'unknown';
    if (openedAt && afterOpeningDurationMonths && Number(afterOpeningDurationMonths) > 0) {
      afterOpeningDeadline = calculateAfterOpeningDeadline(new Date(openedAt), Number(afterOpeningDurationMonths));
      afterOpeningDeadlinePrecision = 'day';
    }

    const product = await Product.create({
      userId: req.user._id,
      name: name.trim(),
      category: category || 'food_beverage',
      brand: brand ? brand.trim() : '',
      imagePath: imagePath || '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      manufacturingDatePrecision,
      printedExpiryDate: printedExpiryDate ? new Date(printedExpiryDate) : null,
      printedExpiryDatePrecision,
      calculatedExpiryDate,
      calculatedExpiryDatePrecision,
      shelfLifeDuration: shelfLifeDuration || '',
      shelfLifeMonths: shelfLifeMonths ? Number(shelfLifeMonths) : null,
      shelfLifeSource: shelfLifeDuration ? 'user_provided' : '',
      openedAt: openedAt ? new Date(openedAt) : null,
      afterOpeningDurationMonths: afterOpeningDurationMonths ? Number(afterOpeningDurationMonths) : null,
      afterOpeningDeadline,
      afterOpeningDeadlinePrecision,
      lifecycleStatus: 'active',
      verificationStatus: scanHistoryId ? 'confirmed' : 'manual',
      dateSource: printedExpiryDate ? 'ocr_printed' : (calculatedExpiryDate ? 'ocr_calculated' : 'manual'),
      notes: notes || ''
    });

    // If attached to a scan history, link it
    if (scanHistoryId) {
      await ScanHistory.findOneAndUpdate(
        { _id: scanHistoryId, userId: req.user._id },
        { productId: product._id, confirmedValues: product.toObject() }
      );
    }

    const responseObj = product.toObject();
    responseObj.expiryStatus = computeExpiryStatus(product);
    responseObj.applicableDeadline = getApplicableDeadline(product);

    res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      product: responseObj
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const obj = product.toObject();
    obj.expiryStatus = computeExpiryStatus(product);
    obj.applicableDeadline = getApplicableDeadline(product);

    res.status(200).json({
      success: true,
      product: obj
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const {
      name,
      category,
      brand,
      purchaseDate,
      manufacturingDate,
      manufacturingDatePrecision,
      printedExpiryDate,
      printedExpiryDatePrecision,
      shelfLifeMonths,
      shelfLifeDuration,
      notes
    } = req.body;

    // Track correction history
    const originalValues = product.toObject();

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category;
    if (brand !== undefined) product.brand = brand.trim();
    if (purchaseDate !== undefined) product.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (notes !== undefined) product.notes = notes;

    if (manufacturingDate !== undefined) {
      product.manufacturingDate = manufacturingDate ? new Date(manufacturingDate) : null;
    }
    if (manufacturingDatePrecision !== undefined) {
      product.manufacturingDatePrecision = manufacturingDatePrecision;
    }

    if (printedExpiryDate !== undefined) {
      product.printedExpiryDate = printedExpiryDate ? new Date(printedExpiryDate) : null;
    }
    if (printedExpiryDatePrecision !== undefined) {
      product.printedExpiryDatePrecision = printedExpiryDatePrecision;
    }

    if (shelfLifeMonths !== undefined) {
      product.shelfLifeMonths = shelfLifeMonths ? Number(shelfLifeMonths) : null;
    }
    if (shelfLifeDuration !== undefined) {
      product.shelfLifeDuration = shelfLifeDuration;
    }

    // Recalculate shelf life if relevant
    if (product.manufacturingDate && product.shelfLifeMonths) {
      product.calculatedExpiryDate = calculateShelfLifeDeadline(product.manufacturingDate, product.shelfLifeMonths);
      product.calculatedExpiryDatePrecision = product.manufacturingDatePrecision;
    }

    await product.save();

    // Log correction in ScanHistory if exists
    const changes = [];
    ['name', 'brand', 'printedExpiryDate', 'manufacturingDate'].forEach(f => {
      if (String(originalValues[f] || '') !== String(product[f] || '')) {
        changes.push({
          field: f,
          fromValue: originalValues[f],
          toValue: product[f],
          reason: 'Manual correction by user',
          timestamp: new Date()
        });
      }
    });

    if (changes.length > 0) {
      await ScanHistory.findOneAndUpdate(
        { productId: product._id, userId: req.user._id },
        { $push: { correctionDetails: { $each: changes } } }
      );
    }

    const obj = product.toObject();
    obj.expiryStatus = computeExpiryStatus(product);
    obj.applicableDeadline = getApplicableDeadline(product);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: obj
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Cancel related pending notifications
    await Notification.updateMany(
      { productId: product._id, userId: req.user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

export async function openProduct(req, res, next) {
  try {
    const { openedAt = new Date(), afterOpeningDurationMonths } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    if (product.lifecycleStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot open product that is already ${product.lifecycleStatus}.`
      });
    }

    const durationMonths = afterOpeningDurationMonths
      ? Number(afterOpeningDurationMonths)
      : (product.afterOpeningDurationMonths || 6); // default to 6 if not specified

    product.openedAt = new Date(openedAt);
    product.afterOpeningDurationMonths = durationMonths;
    product.afterOpeningDeadline = calculateAfterOpeningDeadline(product.openedAt, durationMonths);
    product.afterOpeningDeadlinePrecision = 'day';

    await product.save();

    // Add event to scan history
    await ScanHistory.findOneAndUpdate(
      { productId: product._id, userId: req.user._id },
      {
        $push: {
          correctionDetails: {
            field: 'openedAt',
            fromValue: null,
            toValue: product.openedAt,
            reason: `Product opened. PAO deadline set to ${product.afterOpeningDeadline.toISOString().substring(0, 10)}`,
            timestamp: new Date()
          }
        }
      }
    );

    const obj = product.toObject();
    obj.expiryStatus = computeExpiryStatus(product);
    obj.applicableDeadline = getApplicableDeadline(product);

    res.status(200).json({
      success: true,
      message: 'Product marked as opened. After-opening deadline updated.',
      product: obj
    });
  } catch (err) {
    next(err);
  }
}

export async function consumeProduct(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    product.lifecycleStatus = 'consumed';
    product.consumedAt = new Date();
    await product.save();

    // Cancel any pending notifications for this product
    await Notification.updateMany(
      { productId: product._id, userId: req.user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Audit log
    await ScanHistory.findOneAndUpdate(
      { productId: product._id, userId: req.user._id },
      {
        $push: {
          correctionDetails: {
            field: 'lifecycleStatus',
            fromValue: 'active',
            toValue: 'consumed',
            reason: 'Product marked as consumed',
            timestamp: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Product marked as consumed. Expiry reminders stopped.',
      product
    });
  } catch (err) {
    next(err);
  }
}

export async function disposeProduct(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    product.lifecycleStatus = 'disposed';
    product.disposedAt = new Date();
    await product.save();

    // Cancel pending notifications
    await Notification.updateMany(
      { productId: product._id, userId: req.user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Audit log
    await ScanHistory.findOneAndUpdate(
      { productId: product._id, userId: req.user._id },
      {
        $push: {
          correctionDetails: {
            field: 'lifecycleStatus',
            fromValue: 'active',
            toValue: 'disposed',
            reason: 'Product marked as disposed',
            timestamp: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Product marked as disposed. Expiry reminders stopped.',
      product
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductHistory(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const scans = await ScanHistory.find({
      productId: product._id,
      userId: req.user._id
    }).sort({ createdAt: -1 });

    const notifications = await Notification.find({
      productId: product._id,
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      product,
      scans,
      notifications
    });
  } catch (err) {
    next(err);
  }
}
