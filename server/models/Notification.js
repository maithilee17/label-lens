import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['expiry_warning', 'expiry_day', 'expired', 'after_opening_warning', 'system'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'cancelled', 'failed'],
      default: 'sent',
      index: true
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'both'],
      default: 'in_app'
    },
    errorMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    dedupeKey: {
      type: String,
      unique: true,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
