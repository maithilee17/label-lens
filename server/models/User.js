import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    timezone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: function (v) {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: v });
            return true;
          } catch (e) {
            return false;
          }
        },
        message: props => `${props.value} is not a valid IANA timezone!`
      }
    },
    reminderDaysBefore: {
      type: Number,
      default: 2,
      min: [1, 'Reminder days must be at least 1 day before expiry'],
      max: [60, 'Reminder days cannot exceed 60 days']
    },
    expiryDayReminderEnabled: {
      type: Boolean,
      default: true
    },
    afterOpeningReminderEnabled: {
      type: Boolean,
      default: true
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
