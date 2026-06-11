import { Router } from 'express';
import {
  addComment,
  getCommentsByTask,
  updateComment,
  deleteComment,
  downloadCommentAttachment,
  removeCommentAttachment
} from '../controllers/commentController';
import { verifyToken } from '../middleware/authMiddleware';
import { upload, checkFileSize } from '../utils/uploadConfig';

const router = Router();

// CRITICAL: download and attachment routes must be BEFORE /:taskId
// otherwise Express reads "download" or the comment ID as a taskId value

// GET /api/comments/download/:commentId — download file attached to a comment
router.get('/download/:commentId', verifyToken, downloadCommentAttachment);

// POST /api/comments/:taskId — add a comment (with optional file attachment)
router.post('/:taskId', verifyToken, upload.single('file'), checkFileSize, addComment);

// GET /api/comments/:taskId — get all comments for a task
router.get('/:taskId', verifyToken, getCommentsByTask);

// PUT /api/comments/:commentId — edit own comment only
router.put('/:commentId', verifyToken, updateComment);

// DELETE /api/comments/:commentId/attachment — remove file attached to a comment
router.delete('/:commentId/attachment', verifyToken, removeCommentAttachment);

// DELETE /api/comments/:commentId — delete a comment
router.delete('/:commentId', verifyToken, deleteComment);

export default router;
