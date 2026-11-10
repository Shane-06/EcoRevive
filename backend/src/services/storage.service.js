const fs = require('fs');
const path = require('path');
const config = require('../config');
const { BadRequestError, AppError } = require('../utils/errors');

class StorageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (_e) {
        // Ignored if cannot create in restricted environments
      }
    }
  }

  get provider() {
    return (config.storage && config.storage.provider) || 'local';
  }

  get isSupabase() {
    return this.provider === 'supabase';
  }

  get bucket() {
    return (config.storage && config.storage.bucket) || 'ecorevive-evidence';
  }

  get supabaseUrl() {
    return (config.storage && config.storage.supabaseUrl) || '';
  }

  get supabaseKey() {
    return (config.storage && config.storage.supabaseServiceRoleKey) || '';
  }

  /**
   * Generates a unique, collision-resistant filename/key.
   * @param {string} prefix - 'trees' or 'health'
   * @param {string} originalName - Original filename
   * @returns {string} Unique file key
   */
  generateFileKey(prefix, originalName = 'photo.jpg') {
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const singularPrefix = prefix === 'health' ? 'health' : 'tree';

    if (this.isSupabase) {
      return `${prefix}/${singularPrefix}-${timestamp}-${random}${ext}`;
    }
    return `uploads/tree-${timestamp}-${random}${ext}`;
  }

  /**
   * Uploads an uploaded file (from Multer) to either local disk or Supabase Storage.
   * @param {object} params
   * @param {object} params.file - Multer file object (has buffer in memory mode, or filename/path in disk mode)
   * @param {string} [params.prefix='trees'] - 'trees' | 'health'
   * @returns {Promise<string>} Stable object key or local relative path stored in database
   */
  async uploadFile({ file, prefix = 'trees' }) {
    if (!file) {
      throw new BadRequestError('No file provided for upload', 'MISSING_FILE');
    }

    const key = this.generateFileKey(prefix, file.originalname);

    if (this.isSupabase) {
      // Memory buffer upload to Supabase Storage
      const buffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
      if (!buffer) {
        throw new BadRequestError('File buffer is empty or unreadable', 'EMPTY_FILE');
      }

      await this.uploadBufferToSupabase({
        key,
        buffer,
        mimeType: file.mimetype || 'image/jpeg',
      });

      return key;
    }

    // Local disk mode
    if (file.filename) {
      return `uploads/${file.filename}`;
    }

    // If memory storage in local mode, write buffer to disk
    if (file.buffer) {
      const targetPath = path.join(this.uploadDir, path.basename(key));
      fs.writeFileSync(targetPath, file.buffer);
      return `uploads/${path.basename(key)}`;
    }

    return key;
  }

  /**
   * Uploads a raw buffer to Supabase Storage REST API using service-role authorization.
   * @param {object} params
   * @param {string} params.key - Storage object path (e.g. 'trees/tree-123.jpg')
   * @param {Buffer} params.buffer - Image binary buffer
   * @param {string} params.mimeType - MIME type
   */
  async uploadBufferToSupabase({ key, buffer, mimeType }) {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new AppError(
        'Supabase Storage is selected but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured',
        500,
        'STORAGE_CONFIG_ERROR'
      );
    }

    const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${key}`;

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': mimeType || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: buffer,
      });
    } catch (networkErr) {
      throw new AppError(
        `Failed to connect to Supabase Storage: ${networkErr.message}`,
        502,
        'STORAGE_NETWORK_ERROR'
      );
    }

    if (!response.ok) {
      let errBody = '';
      try {
        errBody = await response.text();
      } catch (_e) {
        // Ignore response body read error
      }
      throw new AppError(
        `Supabase Storage upload failed with status ${response.status}: ${errBody}`,
        502,
        'STORAGE_UPLOAD_ERROR'
      );
    }
  }

  /**
   * Generates a short-lived signed URL for an authorized client to view a private storage object.
   * @param {string} objectKey - Stored photo reference
   * @param {number} [expiresIn=3600] - Expiry in seconds (default: 1 hour)
   * @returns {Promise<string|null>} Signed URL or local URL path
   */
  async getSignedUrl(objectKey, expiresIn = 3600) {
    if (!objectKey || typeof objectKey !== 'string') {
      return null;
    }

    const trimmed = objectKey.trim();

    // Already a complete external URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Local uploads reference
    if (trimmed.startsWith('uploads/')) {
      const cleanPath = trimmed.replace(/^\/+/, '');
      return `/${cleanPath}`;
    }

    // Supabase object reference (e.g. 'trees/...' or 'health/...')
    if (trimmed.startsWith('trees/') || trimmed.startsWith('health/')) {
      if (!this.supabaseUrl || !this.supabaseKey) {
        // Fallback placeholder if Supabase is unconfigured or in offline mock testing
        return `${this.supabaseUrl || 'https://supabase.local'}/storage/v1/object/sign/${this.bucket}/${trimmed}?token=mock-token`;
      }

      const endpoint = `${this.supabaseUrl}/storage/v1/object/sign/${this.bucket}/${trimmed}`;
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: parseInt(expiresIn, 10) || 3600 }),
        });
      } catch (networkErr) {
        throw new AppError(
          `Failed to sign Supabase Storage URL: ${networkErr.message}`,
          502,
          'STORAGE_SIGN_ERROR'
        );
      }

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch (_e) {
          // Ignore error body parsing failure
        }
        throw new AppError(
          `Supabase Storage sign failed with status ${response.status}: ${errBody}`,
          502,
          'STORAGE_SIGN_FAILED'
        );
      }

      const data = await response.json();
      const signedPath = data.signedURL || data.signedUrl || '';
      if (!signedPath) {
        throw new AppError('Supabase sign API did not return signedURL', 502, 'STORAGE_SIGN_INVALID');
      }

      if (signedPath.startsWith('http://') || signedPath.startsWith('https://')) {
        return signedPath;
      }
      const normalizedPath = signedPath.startsWith('/storage/v1')
        ? signedPath
        : `/storage/v1${signedPath.startsWith('/') ? signedPath : '/' + signedPath}`;
      return `${this.supabaseUrl}${normalizedPath}`;
    }

    return trimmed;
  }

  /**
   * Deletes a file from storage.
   * @param {string} objectKey
   */
  async deleteFile(objectKey) {
    if (!objectKey || typeof objectKey !== 'string') return;
    const trimmed = objectKey.trim();

    if (trimmed.startsWith('uploads/')) {
      const localPath = path.join(this.uploadDir, path.basename(trimmed));
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (_e) {
          // Ignore local unlink errors
        }
      }
      return;
    }

    if (this.isSupabase && (trimmed.startsWith('trees/') || trimmed.startsWith('health/'))) {
      if (!this.supabaseUrl || !this.supabaseKey) return;
      const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucket}`;
      try {
        await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [trimmed] }),
        });
      } catch (_e) {
        // Ignore remote delete network error
      }
    }
  }
}

module.exports = new StorageService();
