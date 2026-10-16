import express from 'express';
import { getDashboardSummary, getRecentActivity } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);
router.get('/recent-activity', getRecentActivity);

export default router;
