import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 150
    },
    category: {
      type: String,
      enum: ['food_beverage', 'skincare', 'makeup_cosmetics', 'medicine', 'household', 'other'],
      default: 'food_beverage',
      index: true
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    batchNumber: {
      type: String,
      trim: true,
      default: ''
    },
    netWeight: {
      type: String,
      trim: true,
      default: ''
    },
    imagePath: {
      type: String,
      default: ''
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    // Manufacturing Date and Precision
    manufacturingDate: {
      type: Date,
      default: null
    },
    manufacturingDatePrecision: {
      type: String,
      enum: ['day', 'month', 'year', 'unknown'],
      default: 'unknown'
    },
    manufacturingDateRaw: {
      type: String,
      default: ''
    },
    // Printed Expiry Date and Precision
    printedExpiryDate: {
      type: Date,
      default: null
    },
    printedExpiryDatePrecision: {
      type: String,
      enum: ['day', 'month', 'year', 'unknown'],
      default: 'unknown'
    },
    printedExpiryDateRaw: {
      type: String,
      default: ''
    },
    // Calculated Expiry Date and Precision
    calculatedExpiryDate: {
      type: Date,
      default: null
    },
    calculatedExpiryDatePrecision: {
      type: String,
      enum: ['day', 'month', 'year', 'unknown'],
      default: 'unknown'
    },
    shelfLifeDuration: {
      type: String,
      default: ''
    },
    shelfLifeMonths: {
      type: Number,
      default: null
    },
    shelfLifeSource: {
      type: String,
      default: ''
    },
    // Period After Opening (PAO)
    openedAt: {
      type: Date,
      default: null
    },
    afterOpeningDurationMonths: {
      type: Number,
      default: null
    },
    afterOpeningDeadline: {
      type: Date,
      default: null
    },
    afterOpeningDeadlinePrecision: {
      type: String,
      enum: ['day', 'month', 'year', 'unknown'],
      default: 'unknown'
    },
    // Lifecycle & Verification
    lifecycleStatus: {
      type: String,
      enum: ['active', 'consumed', 'disposed'],
      default: 'active',
      index: true
    },
    consumedAt: {
      type: Date,
      default: null
    },
    disposedAt: {
      type: Date,
      default: null
    },
    verificationStatus: {
      type: String,
      enum: ['confirmed', 'manual', 'needs_verification'],
      default: 'confirmed'
    },
    dateSource: {
      type: String,
      enum: ['ocr_printed', 'ocr_calculated', 'manual', 'hybrid', 'unknown'],
      default: 'manual'
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying user active products efficiently
productSchema.index({ userId: 1, lifecycleStatus: 1 });
productSchema.index({ userId: 1, category: 1 });

export const Product = mongoose.model('Product', productSchema);
