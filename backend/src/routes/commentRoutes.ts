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

/**
 * @swagger
 * /api/comments/download/{commentId}:
 *   get:
 *     summary: Download the file attached to a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: File download stream
 *       404:
 *         description: Comment or file not found
 */
router.get('/download/:commentId', verifyToken, downloadCommentAttachment);

/**
 * @swagger
 * /api/comments/{taskId}:
 *   post:
 *     summary: Post a comment on a task with optional file attachment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Great progress on this task!
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional file attachment (max 10MB for docs, 100MB for video)
 *     responses:
 *       201:
 *         description: Comment posted successfully
 *       400:
 *         description: Validation error or file too large
 *       403:
 *         description: Forbidden — user does not have access to this task
 */
router.post('/:taskId', verifyToken, upload.single('file'), checkFileSize, addComment);

/**
 * @swagger
 * /api/comments/{taskId}:
 *   get:
 *     summary: Get all comments for a task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: List of comments with author details
 *       403:
 *         description: Forbidden — Collaborator accessing unassigned task
 */
router.get('/:taskId', verifyToken, getCommentsByTask);

/**
 * @swagger
 * /api/comments/{commentId}:
 *   put:
 *     summary: Edit own comment text
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Updated comment text
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       403:
 *         description: Forbidden — cannot edit another user's comment
 *       404:
 *         description: Comment not found
 */
router.put('/:commentId', verifyToken, updateComment);

/**
 * @swagger
 * /api/comments/{commentId}/attachment:
 *   delete:
 *     summary: Remove the file attached to a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Attachment removed successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.delete('/:commentId/attachment', verifyToken, removeCommentAttachment);

/**
 * @swagger
 * /api/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (Admin can delete any, others can delete own only)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       403:
 *         description: Forbidden — cannot delete another user's comment
 *       404:
 *         description: Comment not found
 */
router.delete('/:commentId', verifyToken, deleteComment);

export default router;
