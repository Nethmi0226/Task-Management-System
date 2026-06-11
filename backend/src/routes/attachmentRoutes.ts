import { Router } from 'express';
import {
  uploadAttachment,
  getAttachmentsByTask,
  downloadAttachment,
  replaceAttachment,
  deleteAttachment
} from '../controllers/attachmentController';
import { verifyToken } from '../middleware/authMiddleware';
import { upload, checkFileSize } from '../utils/uploadConfig';

const router = Router();

// CRITICAL: download route must be BEFORE /:taskId
// otherwise Express reads "download" as a taskId value
router.get('/download/:attachmentId', verifyToken, downloadAttachment);

// POST /api/attachments/:taskId — upload a file to a task
router.post('/:taskId', verifyToken, upload.single('file'), checkFileSize, uploadAttachment);

// GET /api/attachments/:taskId — get all attachment records for a task
router.get('/:taskId', verifyToken, getAttachmentsByTask);

// PUT /api/attachments/:attachmentId/replace — replace an existing attachment
router.put('/:attachmentId/replace', verifyToken, upload.single('file'), checkFileSize, replaceAttachment);

// DELETE /api/attachments/:attachmentId — delete an attachment
router.delete('/:attachmentId', verifyToken, deleteAttachment);

export default router;
