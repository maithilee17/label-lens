import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/labellens',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_labellens_jwt_development_key_12345',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@labellens.local'
  }
};

export function validateEnv() {
  if (config.env === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_change_in_production') {
      throw new Error('FATAL: JWT_SECRET must be set to a secure string in production!');
    }
    if (!process.env.MONGODB_URI) {
      throw new Error('FATAL: MONGODB_URI must be configured in production!');
    }
  }
}
