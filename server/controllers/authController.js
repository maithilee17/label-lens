import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

function signToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        reminderDaysBefore: user.reminderDaysBefore,
        expiryDayReminderEnabled: user.expiryDayReminderEnabled,
        afterOpeningReminderEnabled: user.afterOpeningReminderEnabled,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        reminderDaysBefore: user.reminderDaysBefore,
        expiryDayReminderEnabled: user.expiryDayReminderEnabled,
        afterOpeningReminderEnabled: user.afterOpeningReminderEnabled,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

export async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      timezone: req.user.timezone,
      reminderDaysBefore: req.user.reminderDaysBefore,
      expiryDayReminderEnabled: req.user.expiryDayReminderEnabled,
      afterOpeningReminderEnabled: req.user.afterOpeningReminderEnabled,
      emailNotificationsEnabled: req.user.emailNotificationsEnabled,
      createdAt: req.user.createdAt
    }
  });
}

export async function updateProfile(req, res, next) {
  try {
    const {
      name,
      timezone,
      reminderDaysBefore,
      expiryDayReminderEnabled,
      afterOpeningReminderEnabled,
      emailNotificationsEnabled
    } = req.body;

    const user = req.user;

    if (name) user.name = name.trim();
    if (timezone) user.timezone = timezone;
    if (reminderDaysBefore !== undefined) user.reminderDaysBefore = Number(reminderDaysBefore);
    if (expiryDayReminderEnabled !== undefined) user.expiryDayReminderEnabled = Boolean(expiryDayReminderEnabled);
    if (afterOpeningReminderEnabled !== undefined) user.afterOpeningReminderEnabled = Boolean(afterOpeningReminderEnabled);
    if (emailNotificationsEnabled !== undefined) user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
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

export async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (err) {
    next(err);
  }
}
