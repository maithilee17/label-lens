import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  triggerReminderCheck
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.post('/trigger-check', triggerReminderCheck);

export default router;
