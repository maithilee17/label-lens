import { Product } from '../models/Product.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { Notification } from '../models/Notification.js';
import { computeExpiryStatus, getApplicableDeadline } from '../services/expiryService.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user._id;

    // Fetch all products for the user to compute dynamic statuses
    const allProducts = await Product.find({ userId });

    const stats = {
      totalActive: 0,
      expiringWithinTwoDays: 0,
      expiringSoon: 0,
      expired: 0,
      unknown: 0,
      opened: 0,
      consumed: 0,
      disposed: 0
    };

    const categoryCounts = {
      food_beverage: 0,
      skincare: 0,
      makeup_cosmetics: 0,
      medicine: 0,
      household: 0,
      other: 0
    };

    const statusCounts = {
      fresh: 0,
      expiring_soon: 0,
      expired: 0,
      unknown: 0
    };

    const now = new Date();
    const activeProductsWithDeadline = [];

    for (const p of allProducts) {
      if (p.lifecycleStatus === 'consumed') {
        stats.consumed++;
        continue;
      }
      if (p.lifecycleStatus === 'disposed') {
        stats.disposed++;
        continue;
      }

      // Active products
      stats.totalActive++;
      if (p.openedAt) {
        stats.opened++;
      }

      // Category breakdown for active products
      if (categoryCounts[p.category] !== undefined) {
        categoryCounts[p.category]++;
      } else {
        categoryCounts.other++;
      }

      // Compute dynamic status
      const expiryStatus = computeExpiryStatus(p, now);
      statusCounts[expiryStatus]++;

      if (expiryStatus === 'expired') {
        stats.expired++;
      } else if (expiryStatus === 'unknown') {
        stats.unknown++;
      } else if (expiryStatus === 'expiring_soon') {
        stats.expiringSoon++;
      }

      // Check within 2 days
      const applicable = getApplicableDeadline(p);
      if (applicable?.date) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((new Date(applicable.date) - now) / msPerDay);
        if (diffDays >= 0 && diffDays <= 2) {
          stats.expiringWithinTwoDays++;
        }

        activeProductsWithDeadline.push({
          _id: p._id,
          name: p.name,
          category: p.category,
          brand: p.brand,
          imagePath: p.imagePath,
          deadline: applicable.date,
          deadlineSource: applicable.source,
          daysRemaining: diffDays,
          expiryStatus
        });
      }
    }

    // "Use First" list: active products expiring soonest (sorted ascending)
    activeProductsWithDeadline.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const useFirst = activeProductsWithDeadline.slice(0, 6);

    // Recent Scans
    const recentScans = await ScanHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalImagePath originalCandidateValues verificationStatus createdAt scanTimestamp');

    // Upcoming notifications
    const upcomingNotifications = await Notification.find({
      userId,
      readAt: null
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Chart formatted data
    const categoryChartData = Object.entries(categoryCounts).map(([cat, count]) => ({
      name: cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      key: cat,
      count
    }));

    const statusChartData = [
      { name: 'Fresh', count: statusCounts.fresh, color: '#16a34a' },
      { name: 'Expiring Soon', count: statusCounts.expiring_soon, color: '#f59e0b' },
      { name: 'Expired', count: statusCounts.expired, color: '#ef4444' },
      { name: 'Unknown', count: statusCounts.unknown, color: '#94a3b8' }
    ];

    res.status(200).json({
      success: true,
      stats,
      useFirst,
      recentScans,
      upcomingNotifications,
      categoryChartData,
      statusChartData
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecentActivity(req, res, next) {
  try {
    const userId = req.user._id;

    const [recentProducts, recentScans, recentNotifications] = await Promise.all([
      Product.find({ userId }).sort({ updatedAt: -1 }).limit(5),
      ScanHistory.find({ userId }).sort({ createdAt: -1 }).limit(5),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(5)
    ]);

    res.status(200).json({
      success: true,
      recentProducts,
      recentScans,
      recentNotifications
    });
  } catch (err) {
    next(err);
  }
}
