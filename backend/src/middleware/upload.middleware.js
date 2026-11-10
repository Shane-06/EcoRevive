const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { BadRequestError } = require('../utils/errors');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (_e) {
    // Ignore in read-only / restricted environments
  }
}

// Configure disk storage for local mode
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `tree-${uniqueSuffix}${ext}`);
  },
});

// Configure memory storage for Supabase mode (avoids writing to ephemeral disk)
const memoryStorage = multer.memoryStorage();

// Dynamic storage adapter: routes to memoryStorage when STORAGE_PROVIDER=supabase, else diskStorage
const dynamicStorage = {
  _handleFile(req, file, cb) {
    const provider = (config.storage && config.storage.provider) || 'local';
    const targetStorage = provider === 'supabase' ? memoryStorage : diskStorage;
    targetStorage._handleFile(req, file, cb);
  },
  _removeFile(req, file, cb) {
    const provider = (config.storage && config.storage.provider) || 'local';
    const targetStorage = provider === 'supabase' ? memoryStorage : diskStorage;
    targetStorage._removeFile(req, file, cb);
  },
};

// File filter for allowed image MIME types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Invalid file type. Allowed formats: JPEG, PNG, WEBP',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

const upload = multer({
  storage: dynamicStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Middleware wrapper that handles single image upload if present,
 * while allowing pure JSON requests to pass through cleanly.
 */
const optionalPhotoUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const singleUpload = upload.single('photo');
    return singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new BadRequestError(
                'File size exceeds 10MB limit',
                'FILE_TOO_LARGE'
              )
            );
          }
          return next(new BadRequestError(err.message, 'UPLOAD_ERROR'));
        }
        return next(err);
      }
      return next();
    });
  }
  return next();
};

module.exports = {
  upload,
  optionalPhotoUpload,
};
