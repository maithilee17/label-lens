/**
 * Notification Service for LabelLens
 * Evaluates active products, schedules reminders based on user preferences and timezone,
 * generates in-app notifications with deduplication, and handles optional email delivery.
 */

import nodemailer from 'nodemailer';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { getApplicableDeadline } from './expiryService.js';
import { config } from '../config/env.js';

let mailTransporter = null;

function getMailTransporter() {
  if (!mailTransporter && config.email.host && config.email.user) {
    mailTransporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }
  return mailTransporter;
}

/**
 * Convert Date to YYYY-MM-DD string in a specified IANA timezone
 */
export function getDateStringInTimezone(date, timezone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch (err) {
    return date.toISOString().substring(0, 10);
  }
}

/**
 * Process all scheduled reminders across all users
 * Safe to run repeatedly (idempotent).
 */
export async function processReminders(overrideNow = null) {
  const now = overrideNow ? new Date(overrideNow) : new Date();
  const results = {
    processedUsers: 0,
    processedProducts: 0,
    createdNotifications: 0,
    skippedDuplicates: 0,
    emailsSent: 0
  };

  const users = await User.find({});
  results.processedUsers = users.length;

  for (const user of users) {
    const timezone = user.timezone || 'UTC';
    const userTodayStr = getDateStringInTimezone(now, timezone);
    const userTodayDate = new Date(`${userTodayStr}T00:00:00.000Z`);

    // Fetch only active products for this user
    const activeProducts = await Product.find({
      userId: user._id,
      lifecycleStatus: 'active'
    });

    for (const product of activeProducts) {
      results.processedProducts++;
      const applicable = getApplicableDeadline(product);
      if (!applicable || !applicable.date) continue;

      const deadline = new Date(applicable.date);
      const deadlineStr = getDateStringInTimezone(deadline, timezone);
      const deadlineDate = new Date(`${deadlineStr}T00:00:00.000Z`);

      const msPerDay = 24 * 60 * 60 * 1000;
      const daysUntilExpiry = Math.round((deadlineDate - userTodayDate) / msPerDay);

      // 1. Advance warning reminder (e.g. X days before)
      const targetDaysBefore = user.reminderDaysBefore || 2;
      if (daysUntilExpiry === targetDaysBefore) {
        const dedupeKey = `remind_${user._id}_${product._id}_${targetDaysBefore}d_${deadlineStr}`;
        await createNotificationIfNotExists({
          userId: user._id,
          productId: product._id,
          type: applicable.source === 'after_opening' ? 'after_opening_warning' : 'expiry_warning',
          title: `Expiry Warning: ${product.name}`,
          message: `Your product "${product.name}" expires in ${targetDaysBefore} days (${deadlineStr}).`,
          scheduledFor: now,
          dedupeKey,
          user,
          results
        });
      }

      // 2. Expiry-day reminder
      if (daysUntilExpiry === 0 && user.expiryDayReminderEnabled !== false) {
        const dedupeKey = `remind_${user._id}_${product._id}_day0_${deadlineStr}`;
        await createNotificationIfNotExists({
          userId: user._id,
          productId: product._id,
          type: 'expiry_day',
          title: `Expires Today: ${product.name}`,
          message: `Your product "${product.name}" reaches its expiry deadline today (${deadlineStr}).`,
          scheduledFor: now,
          dedupeKey,
          user,
          results
        });
      }

      // 3. Expired alert (1 day after)
      if (daysUntilExpiry === -1) {
        const dedupeKey = `remind_${user._id}_${product._id}_expired_${deadlineStr}`;
        await createNotificationIfNotExists({
          userId: user._id,
          productId: product._id,
          type: 'expired',
          title: `Product Expired: ${product.name}`,
          message: `"${product.name}" expired yesterday. Please check, consume, or dispose of it safely.`,
          scheduledFor: now,
          dedupeKey,
          user,
          results
        });
      }
    }
  }

  return results;
}

async function createNotificationIfNotExists({
  userId,
  productId,
  type,
  title,
  message,
  scheduledFor,
  dedupeKey,
  user,
  results
}) {
  const existing = await Notification.findOne({ dedupeKey });
  if (existing) {
    results.skippedDuplicates++;
    return;
  }

  const channel = user.emailNotificationsEnabled && config.email.host ? 'both' : 'in_app';

  const notification = await Notification.create({
    userId,
    productId,
    type,
    title,
    message,
    scheduledFor,
    status: 'sent',
    channel,
    dedupeKey
  });

  results.createdNotifications++;

  // Optional email sending if configured
  if (channel === 'both') {
    const transporter = getMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.email.from,
          to: user.email,
          subject: `[LabelLens] ${title}`,
          text: message,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #16a34a;">LabelLens Expiry Reminder</h2>
            <p style="font-size: 16px;">${message}</p>
            <p style="color: #64748b; font-size: 13px;">Manage your products at <a href="${config.clientUrl}">${config.clientUrl}</a></p>
          </div>`
        });
        results.emailsSent++;
      } catch (err) {
        console.error('[NotificationService] Email delivery error:', err.message);
        notification.errorMetadata = { emailError: err.message };
        await notification.save();
      }
    }
  }
}
