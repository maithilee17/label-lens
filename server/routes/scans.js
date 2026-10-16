import express from 'express';
import { processScan, getScanById, confirmScan, rescan } from '../controllers/scanController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { scanLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.post('/', scanLimiter, upload.single('image'), processScan);
router.get('/:id', getScanById);
router.patch('/:id/confirm', confirmScan);
router.post('/:id/rescan', scanLimiter, upload.single('image'), rescan);

export default router;
