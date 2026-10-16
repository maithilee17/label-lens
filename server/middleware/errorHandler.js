export function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed limit (10MB).'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `An account or record with this ${field} already exists.`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
