import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);
router.patch('/password', authenticate, updatePassword);

export default router;
