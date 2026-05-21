import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Create upload folder if it does not exist
const uploadDir = path.join(__dirname, '../../uploads/tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Upload folder created at:', uploadDir);
}

// Configure storage — where and how to save files
const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  // Rename file to avoid conflicts
  // Example: 1714500000000-482736.pdf
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1000000)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Separate allowed types into two groups
// This is needed because each group has a different size limit
const imageAndDocumentTypes: string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const videoTypes: string[] = [
  'video/mp4',
  'video/quicktime'
];

// Size limits
const IMAGE_AND_DOCUMENT_LIMIT: number = 10 * 1024 * 1024;  // 10MB
const VIDEO_LIMIT: number = 100 * 1024 * 1024;               // 100MB

// Extend Request to hold file category
declare global {
  namespace Express {
    interface Request {
      fileCategory?: 'video' | 'imageOrDocument';
    }
  }
}

// File filter — check type
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const isImageOrDocument = imageAndDocumentTypes.includes(file.mimetype);
  const isVideo = videoTypes.includes(file.mimetype);

  if (!isImageOrDocument && !isVideo) {
    return cb(
      new Error('File type not allowed. Allowed types: JPEG, PNG, GIF, PDF, Word, Excel, MP4, MOV') as any
    );
  }

  // Store the file category on the request so we can check size later
  req.fileCategory = isVideo ? 'video' : 'imageOrDocument';
  cb(null, true);
};

// Custom size check middleware — runs after file is saved
// multer limits apply before fileFilter so we cannot use it for per-type limits
export const checkFileSize = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) return next();

  const fileSize = req.file.size;
  const category = req.fileCategory;

  if (category === 'video' && fileSize > VIDEO_LIMIT) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({
      errorCode: 400,
      message: 'Bad Request',
      description: 'Video files cannot exceed 100MB'
    });
    return;
  }

  if (category === 'imageOrDocument' && fileSize > IMAGE_AND_DOCUMENT_LIMIT) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({
      errorCode: 400,
      message: 'Bad Request',
      description: 'Image and document files cannot exceed 10MB'
    });
    return;
  }

  next();
};

// Create the multer instance
// Overall limit is 100MB (the highest allowed)
// Per-type limits are enforced by checkFileSize middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB overall limit
  }
});
