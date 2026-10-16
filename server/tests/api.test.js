import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Notification } from '../models/Notification.js';
import { processReminders } from '../services/notificationService.js';

describe('LabelLens Backend API Integration Tests', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;

  beforeAll(async () => {
    // Connect to local MongoDB instance
    await connectDB();
    // Clean test collections
    await User.deleteMany({ email: /@test\.com$/ });
    await Product.deleteMany({});
    await Notification.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test\.com$/ });
    await Product.deleteMany({});
    await Notification.deleteMany({});
    await disconnectDB();
  });

  describe('1. Authentication Flow', () => {
    test('registers User 1 successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Tester',
          email: 'alice@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@test.com');
      user1Token = res.body.token;
      user1Id = res.body.user.id;
    });

    test('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Duplicate',
          email: 'alice@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    test('registers User 2 successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Isolation',
          email: 'bob@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      user2Token = res.body.token;
      user2Id = res.body.user.id;
    });

    test('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@test.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('gets profile with valid token via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Alice Tester');
    });

    test('rejects unauthorized access without token', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Product Management & Ownership Enforcement', () => {
    let aliceProductId;

    test('creates a product for User 1', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Organic Milk',
          category: 'food_beverage',
          brand: 'FarmFresh',
          printedExpiryDate: '2026-10-25',
          printedExpiryDatePrecision: 'day',
          notes: 'Keep chilled'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.product.name).toBe('Organic Milk');
      expect(res.body.product.expiryStatus).toBeDefined();
      aliceProductId = res.body.product._id;
    });

    test('User 2 cannot access or view User 1 product (IDOR prevention)', async () => {
      const res = await request(app)
        .get(`/api/products/${aliceProductId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
    });

    test('User 2 cannot modify or update User 1 product', async () => {
      const res = await request(app)
        .patch(`/api/products/${aliceProductId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Product Name' });

      expect(res.status).toBe(404);
    });

    test('User 2 cannot delete User 1 product', async () => {
      const res = await request(app)
        .delete(`/api/products/${aliceProductId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
    });

    test('User 1 can view, update, and search their product', async () => {
      // Get single
      const res = await request(app)
        .get(`/api/products/${aliceProductId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('Organic Milk');

      // Update
      const updateRes = await request(app)
        .patch(`/api/products/${aliceProductId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ brand: 'FarmFresh Premium' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.product.brand).toBe('FarmFresh Premium');

      // Search
      const searchRes = await request(app)
        .get('/api/products?search=Milk')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.products.length).toBe(1);
    });

    test('Lifecycle: opens product and sets after-opening deadline', async () => {
      const res = await request(app)
        .patch(`/api/products/${aliceProductId}/open`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          openedAt: '2026-10-16',
          afterOpeningDurationMonths: 3
        });

      expect(res.status).toBe(200);
      expect(res.body.product.openedAt).toBeDefined();
      expect(res.body.product.afterOpeningDeadline).toBeDefined();
      expect(res.body.product.afterOpeningDurationMonths).toBe(3);
    });

    test('Lifecycle: marks product as consumed', async () => {
      const res = await request(app)
        .patch(`/api/products/${aliceProductId}/consume`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.product.lifecycleStatus).toBe('consumed');
      expect(res.body.product.consumedAt).toBeDefined();
    });

    test('Dashboard summary reflects real user data', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.consumed).toBe(1);
      expect(res.body.categoryChartData).toBeDefined();
    });
  });

  describe('3. Scheduled Reminder & Deduplication Engine', () => {
    let reminderProductId;

    beforeAll(async () => {
      // Create an active product expiring in 2 days from simulated date 2026-10-16
      // Deadline: 2026-10-18
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Yogurt Tub',
          category: 'food_beverage',
          printedExpiryDate: '2026-10-18',
          printedExpiryDatePrecision: 'day'
        });
      reminderProductId = res.body.product._id;
    });

    test('evaluates reminders and creates notification for 2-days-before expiry', async () => {
      // Run reminder evaluation at reference date 2026-10-16
      const results = await processReminders(new Date('2026-10-16T10:00:00Z'));
      expect(results.createdNotifications).toBeGreaterThanOrEqual(1);

      // Verify notification in DB
      const notifs = await Notification.find({
        userId: user1Id,
        productId: reminderProductId
      });
      expect(notifs.length).toBe(1);
      expect(notifs[0].type).toBe('expiry_warning');
      expect(notifs[0].title).toContain('Expiry Warning: Yogurt Tub');
    });

    test('prevent duplicate reminders if job runs again (idempotent)', async () => {
      const resultsSecondRun = await processReminders(new Date('2026-10-16T10:00:00Z'));
      expect(resultsSecondRun.createdNotifications).toBe(0);
      expect(resultsSecondRun.skippedDuplicates).toBeGreaterThanOrEqual(1);

      const notifs = await Notification.find({
        userId: user1Id,
        productId: reminderProductId
      });
      expect(notifs.length).toBe(1); // Still exactly 1!
    });

    test('fetches notifications and marks as read', async () => {
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.notifications.length).toBeGreaterThanOrEqual(1);
      const notifId = listRes.body.notifications[0]._id;

      const readRes = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.notification.readAt).not.toBeNull();
    });

    test('consumed and disposed products do not receive reminders', async () => {
      // Mark reminderProductId as consumed
      await request(app)
        .patch(`/api/products/${reminderProductId}/consume`)
        .set('Authorization', `Bearer ${user1Token}`);

      // Run reminder job at deadline day
      const resultsOnDeadline = await processReminders(new Date('2026-10-18T10:00:00Z'));

      // Verify no 'day0' notification was generated for the consumed product
      const day0Notif = await Notification.findOne({
        userId: user1Id,
        productId: reminderProductId,
        type: 'expiry_day'
      });
      expect(day0Notif).toBeNull();
    });

    test('production guard rejects trigger-check when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const { config } = await import('../config/env.js');
      config.env = 'production';

      const res = await request(app)
        .post('/api/notifications/trigger-check')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Restore env
      process.env.NODE_ENV = originalEnv;
      config.env = originalEnv;
    });
  });

  describe('4. Scanning and Rescan Flow', () => {
    let scanId;

    test('creates scan history record and supports rescan', async () => {
      const { ScanHistory } = await import('../models/ScanHistory.js');
      const scan = await ScanHistory.create({
        userId: user1Id,
        originalImagePath: '/uploads/test-sample.jpg',
        originalOcrText: 'EXP 20/12/2026',
        ocrConfidence: 85,
        originalCandidateValues: { name: 'Sample Item' },
        verificationStatus: 'needs_verification'
      });
      scanId = scan._id;

      // Rescan unauthorized user rejection
      const unauthRes = await request(app)
        .post(`/api/scans/${scanId}/rescan`)
        .set('Authorization', `Bearer ${user2Token}`);
      expect(unauthRes.status).toBe(404);

      // Get scan by id
      const getRes = await request(app)
        .get(`/api/scans/${scanId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.scan.ocrConfidence).toBe(85);
    });
  });
});
