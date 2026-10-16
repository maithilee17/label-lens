import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  }
});

export const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // limit each IP to 60 OCR scans per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Scanning rate limit exceeded. Please wait a few moments before scanning again.'
  }
});
