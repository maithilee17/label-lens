import express from 'express';
import {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  openProduct,
  consumeProduct,
  disposeProduct,
  getProductHistory
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .patch(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/open', openProduct);
router.patch('/:id/consume', consumeProduct);
router.patch('/:id/dispose', disposeProduct);
router.get('/:id/history', getProductHistory);

export default router;
