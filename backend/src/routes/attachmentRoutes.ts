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

/**
 * @swagger
 * /api/attachments/download/{attachmentId}:
 *   get:
 *     summary: Download a task attachment file
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: File download stream
 *       404:
 *         description: Attachment or file not found
 */
router.get('/download/:attachmentId', verifyToken, downloadAttachment);

/**
 * @swagger
 * /api/attachments/{taskId}:
 *   post:
 *     summary: Upload a file attachment to a task
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Allowed types: JPEG, PNG, GIF, PDF, DOCX, XLSX, MP4, MOV. Max 10MB for docs/images, 100MB for video."
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: File type not allowed or file too large
 *       403:
 *         description: Forbidden — user does not have access to this task
 */
router.post('/:taskId', verifyToken, upload.single('file'), checkFileSize, uploadAttachment);

/**
 * @swagger
 * /api/attachments/{taskId}:
 *   get:
 *     summary: Get all attachment records for a task
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: List of attachment metadata (file paths excluded)
 *       403:
 *         description: Forbidden
 */
router.get('/:taskId', verifyToken, getAttachmentsByTask);

/**
 * @swagger
 * /api/attachments/{attachmentId}/replace:
 *   put:
 *     summary: Replace an existing attachment with a new file
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Attachment replaced successfully
 *       403:
 *         description: Forbidden — can only replace own uploads
 *       404:
 *         description: Attachment not found
 */
router.put('/:attachmentId/replace', verifyToken, upload.single('file'), checkFileSize, replaceAttachment);

/**
 * @swagger
 * /api/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment (Admin can delete any, others can delete own only)
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Attachment not found
 */
router.delete('/:attachmentId', verifyToken, deleteAttachment);

export default router;
