import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Notification } from '../models/Notification.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { calculateAfterOpeningDeadline } from '../services/expiryService.js';

async function seed() {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  const demoEmail = 'demo@labellens.local';
  console.log(`[Seed] Cleaning previous records for ${demoEmail}...`);
  const existingUser = await User.findOne({ email: demoEmail });
  if (existingUser) {
    await Product.deleteMany({ userId: existingUser._id });
    await Notification.deleteMany({ userId: existingUser._id });
    await ScanHistory.deleteMany({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const demoUser = await User.create({
    name: 'Demo Evaluator',
    email: demoEmail,
    passwordHash,
    timezone: 'UTC',
    reminderDaysBefore: 2,
    expiryDayReminderEnabled: true,
    afterOpeningReminderEnabled: true,
    emailNotificationsEnabled: false
  });

  console.log('[Seed] Demo user created:', demoUser.email);

  const now = new Date();

  // Helper for relative dates
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

  const sampleProducts = [
    {
      name: 'Organic Whole Milk 1L',
      category: 'food_beverage',
      brand: 'DairyCrest',
      printedExpiryDate: addDays(now, 2), // Expiring in 2 days!
      printedExpiryDatePrecision: 'day',
      manufacturingDate: addDays(now, -12),
      manufacturingDatePrecision: 'day',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'ocr_printed',
      notes: 'Keep refrigerated below 4°C.'
    },
    {
      name: 'Greek Yogurt Tub 500g',
      category: 'food_beverage',
      brand: 'Chobani',
      printedExpiryDate: addDays(now, 25), // Fresh
      printedExpiryDatePrecision: 'day',
      manufacturingDate: addDays(now, -5),
      manufacturingDatePrecision: 'day',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'ocr_printed',
      notes: 'Contains live cultures.'
    },
    {
      name: 'Fresh Strawberries Pack',
      category: 'food_beverage',
      brand: 'BerryFresh',
      printedExpiryDate: addDays(now, -2), // Expired 2 days ago
      printedExpiryDatePrecision: 'day',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'ocr_printed',
      notes: 'Check for signs of mold before use.'
    },
    {
      name: 'Hyaluronic Acid Face Serum',
      category: 'skincare',
      brand: 'The Ordinary',
      printedExpiryDate: addDays(now, 200),
      printedExpiryDatePrecision: 'month',
      openedAt: addDays(now, -30),
      afterOpeningDurationMonths: 6,
      afterOpeningDeadline: calculateAfterOpeningDeadline(addDays(now, -30), 6),
      afterOpeningDeadlinePrecision: 'day',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'hybrid',
      notes: 'Store in a cool, dark place away from direct sunlight.'
    },
    {
      name: 'Ibuprofen Pain Relief 200mg',
      category: 'medicine',
      brand: 'Advil',
      printedExpiryDate: addDays(now, 365),
      printedExpiryDatePrecision: 'month',
      manufacturingDate: addDays(now, -180),
      manufacturingDatePrecision: 'month',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'ocr_printed',
      notes: 'Store at 20-25°C. Keep out of reach of children.'
    },
    {
      name: 'Multi-Surface Disinfectant',
      category: 'household',
      brand: 'Dettol',
      printedExpiryDate: addDays(now, 450),
      printedExpiryDatePrecision: 'year',
      lifecycleStatus: 'active',
      verificationStatus: 'confirmed',
      dateSource: 'ocr_calculated',
      shelfLifeMonths: 24,
      notes: 'Do not mix with bleach or other cleaning agents.'
    },
    {
      name: 'Organic Almond Milk 1L',
      category: 'food_beverage',
      brand: 'Alpro',
      printedExpiryDate: addDays(now, -10),
      lifecycleStatus: 'consumed',
      consumedAt: addDays(now, -12),
      verificationStatus: 'confirmed',
      dateSource: 'ocr_printed',
      notes: 'Consumed before expiry.'
    }
  ];

  for (const prodData of sampleProducts) {
    const product = await Product.create({
      userId: demoUser._id,
      ...prodData
    });

    // Create a mock ScanHistory record for the product
    await ScanHistory.create({
      userId: demoUser._id,
      productId: product._id,
      originalImagePath: '',
      originalOcrText: `BRAND: ${prodData.brand}\nPROD: ${prodData.name}\nEXP: ${prodData.printedExpiryDate ? prodData.printedExpiryDate.toISOString().substring(0, 10) : ''}`,
      ocrConfidence: 92,
      imageQuality: {
        blurScore: 42.5,
        isBlurry: false,
        brightness: 135,
        isDark: false,
        isOverexposed: false,
        contrast: 58,
        width: 1920,
        height: 1080,
        isLowResolution: false,
        overallRating: 'good',
        warnings: []
      },
      originalCandidateValues: {
        name: prodData.name,
        brand: prodData.brand,
        printedExpiryDate: prodData.printedExpiryDate
      },
      confirmedValues: product.toObject(),
      verificationStatus: 'confirmed'
    });
  }

  // Create initial demo notifications
  await Notification.create([
    {
      userId: demoUser._id,
      type: 'expiry_warning',
      title: 'Expiry Warning: Organic Whole Milk 1L',
      message: 'Your product "Organic Whole Milk 1L" expires in 2 days. Consume soon to ensure freshness.',
      scheduledFor: now,
      status: 'sent',
      channel: 'in_app',
      dedupeKey: `remind_${demoUser._id}_milk_init`
    },
    {
      userId: demoUser._id,
      type: 'system',
      title: 'Welcome to LabelLens!',
      message: 'Your smart expiry tracking system is active. Scan or add products anytime to receive automatic reminders.',
      scheduledFor: now,
      status: 'sent',
      channel: 'in_app',
      dedupeKey: `remind_${demoUser._id}_welcome_init`
    }
  ]);

  console.log(`[Seed] Successfully seeded ${sampleProducts.length} sample products and notifications.`);
  await disconnectDB();
}

seed().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
