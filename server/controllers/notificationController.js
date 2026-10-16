import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { processReminders } from '../services/notificationService.js';
import { config } from '../config/env.js';

export async function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const query = { userId: req.user._id };

    if (unreadOnly === 'true' || unreadOnly === true) {
      query.readAt = null;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.user._id, readAt: null }),
      Notification.find(query)
        .populate('productId', 'name category imagePath')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      unreadCount: 0
    });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      preferences: {
        timezone: user.timezone,
        reminderDaysBefore: user.reminderDaysBefore,
        expiryDayReminderEnabled: user.expiryDayReminderEnabled,
        afterOpeningReminderEnabled: user.afterOpeningReminderEnabled,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const {
      timezone,
      reminderDaysBefore,
      expiryDayReminderEnabled,
      afterOpeningReminderEnabled,
      emailNotificationsEnabled
    } = req.body;

    const user = req.user;
    if (timezone) user.timezone = timezone;
    if (reminderDaysBefore !== undefined) user.reminderDaysBefore = Number(reminderDaysBefore);
    if (expiryDayReminderEnabled !== undefined) user.expiryDayReminderEnabled = Boolean(expiryDayReminderEnabled);
    if (afterOpeningReminderEnabled !== undefined) user.afterOpeningReminderEnabled = Boolean(afterOpeningReminderEnabled);
    if (emailNotificationsEnabled !== undefined) user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully.',
      preferences: {
        timezone: user.timezone,
        reminderDaysBefore: user.reminderDaysBefore,
        expiryDayReminderEnabled: user.expiryDayReminderEnabled,
        afterOpeningReminderEnabled: user.afterOpeningReminderEnabled,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Test & Demo trigger endpoint to run reminder evaluations on demand
 */
export async function triggerReminderCheck(req, res, next) {
  try {
    if (config.env === 'production') {
      return res.status(403).json({
        success: false,
        message: 'On-demand reminder trigger is disabled in production.'
      });
    }

    const { simulatedDate } = req.body;
    const results = await processReminders(simulatedDate ? new Date(simulatedDate) : new Date());

    res.status(200).json({
      success: true,
      message: 'Reminder evaluation triggered successfully.',
      results
    });
  } catch (err) {
    next(err);
  }
}
