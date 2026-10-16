import mongoose from 'mongoose';

const scanHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },
    originalImagePath: {
      type: String,
      default: ''
    },
    originalOcrText: {
      type: String,
      default: ''
    },
    extractedDateCandidates: [
      {
        text: String,
        parsedDate: Date,
        precision: {
          type: String,
          enum: ['day', 'month', 'year', 'unknown']
        },
        type: {
          type: String,
          enum: ['mfg', 'exp', 'best_before', 'pao', 'shelf_life', 'ambiguous', 'unknown']
        },
        confidence: Number,
        context: String
      }
    ],
    ocrConfidence: {
      type: Number,
      default: 0
    },
    imageQuality: {
      blurScore: Number,
      isBlurry: Boolean,
      brightness: Number,
      isDark: Boolean,
      isOverexposed: Boolean,
      contrast: Number,
      width: Number,
      height: Number,
      isLowResolution: Boolean,
      overallRating: {
        type: String,
        enum: ['good', 'acceptable', 'poor'],
        default: 'acceptable'
      },
      warnings: [String]
    },
    originalCandidateValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    confirmedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    verificationStatus: {
      type: String,
      enum: [
        'clear_candidate',
        'needs_verification',
        'poor_image_quality',
        'no_date_found',
        'conflicting_dates',
        'confirmed',
        'manual_fallback'
      ],
      default: 'needs_verification'
    },
    correctionDetails: [
      {
        field: String,
        fromValue: mongoose.Schema.Types.Mixed,
        toValue: mongoose.Schema.Types.Mixed,
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
    scanTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);
