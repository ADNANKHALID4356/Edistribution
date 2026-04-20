/**
 * Image Compression Middleware
 * Handles image upload, compression, and optimization
 * 
 * Features:
 * - Automatic image compression
 * - Multiple format support (JPEG, PNG, WebP)
 * - Thumbnail generation
 * - File size validation
 * - Memory-efficient streaming
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ImageProcessor {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || path.join(__dirname, '../../uploads');
    this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB
    this.quality = options.quality || 80;
    this.formats = options.formats || ['jpeg', 'png', 'webp'];
    this.thumbnailSize = options.thumbnailSize || { width: 200, height: 200 };
    
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  /**
   * Validate image file
   */
  async validateImage(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check file type
    const ext = path.extname(file.name).toLowerCase().replace('.', '');
    if (!this.formats.includes(ext) && !['jpg'].includes(ext)) {
      errors.push(`File type .${ext} not supported. Allowed: ${this.formats.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Compress and optimize image
   */
  async compressImage(inputBuffer, options = {}) {
    const {
      width = null,
      height = null,
      quality = this.quality,
      format = 'jpeg',
      fit = 'inside' // preserve aspect ratio
    } = options;

    let pipeline = sharp(inputBuffer);

    // Get original metadata
    const metadata = await pipeline.metadata();
    console.log(`📷 Original image: ${metadata.width}x${metadata.height}, ${(metadata.size / 1024).toFixed(2)}KB`);

    // Resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
    }

    // Apply format-specific optimization
    switch (format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality,
          progressive: true, // Better compression
          mozjpeg: true // Use mozjpeg for better compression
        });
        break;
      
      case 'png':
        pipeline = pipeline.png({
          quality,
          compressionLevel: 9, // Maximum compression
          progressive: true
        });
        break;
      
      case 'webp':
        pipeline = pipeline.webp({
          quality,
          effort: 6 // Higher effort = better compression
        });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();
    
    console.log(`✅ Compressed image: ${(outputBuffer.length / 1024).toFixed(2)}KB (${((1 - outputBuffer.length / metadata.size) * 100).toFixed(1)}% reduction)`);

    return {
      buffer: outputBuffer,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        originalSize: metadata.size,
        compressedSize: outputBuffer.length,
        compressionRatio: ((1 - outputBuffer.length / metadata.size) * 100).toFixed(1)
      }
    };
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(inputBuffer, options = {}) {
    const { width = this.thumbnailSize.width, height = this.thumbnailSize.height } = options;

    return await this.compressImage(inputBuffer, {
      width,
      height,
      quality: 70, // Lower quality for thumbnails
      format: 'jpeg',
      fit: 'cover' // Crop to fit
    });
  }

  /**
   * Process uploaded image (compress + thumbnail)
   */
  async processUpload(file, options = {}) {
    const {
      generateThumbnail = true,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    // Validate file
    const validation = await this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const filename = this.generateFilename(file.name);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const format = ext === 'jpg' ? 'jpeg' : ext;

    // Read file buffer
    const inputBuffer = await fs.readFile(file.path);

    // Compress main image
    const compressed = await this.compressImage(inputBuffer, {
      maxWidth,
      maxHeight,
      format
    });

    // Save compressed image
    const mainPath = path.join(this.uploadDir, filename);
    await fs.writeFile(mainPath, compressed.buffer);

    const result = {
      filename,
      path: mainPath,
      url: `/uploads/${filename}`,
      size: compressed.buffer.length,
      metadata: compressed.metadata
    };

    // Generate thumbnail if requested
    if (generateThumbnail) {
      const thumbFilename = `thumb_${filename}`;
      const thumbnail = await this.generateThumbnail(inputBuffer);
      const thumbPath = path.join(this.uploadDir, thumbFilename);
      await fs.writeFile(thumbPath, thumbnail.buffer);

      result.thumbnail = {
        filename: thumbFilename,
        path: thumbPath,
        url: `/uploads/${thumbFilename}`,
        size: thumbnail.buffer.length
      };
    }

    console.log(`✅ Image processed: ${filename} (${(result.size / 1024).toFixed(2)}KB)`);

    return result;
  }

  /**
   * Delete uploaded files
   */
  async deleteFiles(filenames) {
    const deletedFiles = [];
    
    for (const filename of filenames) {
      try {
        const filePath = path.join(this.uploadDir, filename);
        await fs.unlink(filePath);
        deletedFiles.push(filename);
      } catch (error) {
        console.error(`Failed to delete ${filename}:`, error.message);
      }
    }

    return deletedFiles;
  }
}

// Global instance
const imageProcessor = new ImageProcessor();

/**
 * Express middleware for image compression
 * Usage: app.post('/upload', compressImage({ maxWidth: 1920 }), controller)
 */
const compressImage = (options = {}) => {
  return async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    try {
      const processedFiles = {};

      // Process each file
      for (const [fieldName, file] of Object.entries(req.files)) {
        if (Array.isArray(file)) {
          // Multiple files
          processedFiles[fieldName] = await Promise.all(
            file.map(f => imageProcessor.processUpload(f, options))
          );
        } else {
          // Single file
          processedFiles[fieldName] = await imageProcessor.processUpload(file, options);
        }
      }

      // Attach processed files to request
      req.processedFiles = processedFiles;
      next();
    } catch (error) {
      console.error('Image compression error:', error);
      res.status(400).json({
        success: false,
        message: 'Image processing failed',
        error: error.message
      });
    }
  };
};

module.exports = {
  imageProcessor,
  compressImage
};
