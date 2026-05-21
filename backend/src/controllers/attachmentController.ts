import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Attachment from '../models/Attachment';
import Task from '../models/Task';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ── UPLOAD ATTACHMENT ──────────────────────────────────
// POST /api/attachments/:taskId
export const uploadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskIdStr = taskId as string;

    if (!req.file) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'No file was uploaded. Please select a file.' });
      return;
    }

    const task = await Task.findByPk(taskIdStr);
    if (!task) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskIdStr}` });
      return;
    }

    // Collaborator can only upload to tasks assigned to them
    if (req.user!.role === 'Collaborator') {
      const { default: TaskAssignee } = await import('../models/TaskAssignee');
      const isAssigned = await TaskAssignee.findOne({ where: { taskId: taskIdStr, userId: req.user!.userId } });
      if (!isAssigned) {
        fs.unlinkSync(req.file.path);
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only upload attachments to tasks assigned to you' });
        return;
      }
    }

    const attachment = await Attachment.create({
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      taskId: parseInt(taskIdStr),
      uploadedBy: req.user!.userId
    });

    const attachmentWithUploader = await Attachment.findByPk(attachment.id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
      attributes: { exclude: ['filePath'] }
    });

    res.status(201).json({ message: 'File uploaded successfully', attachment: attachmentWithUploader });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET ALL ATTACHMENTS FOR A TASK ─────────────────────
// GET /api/attachments/:taskId
export const getAttachmentsByTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskIdStr = taskId as string;

    const task = await Task.findByPk(taskIdStr);
    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskIdStr}` });
      return;
    }

    if (req.user!.role === 'Collaborator') {
      const { default: TaskAssignee } = await import('../models/TaskAssignee');
      const isAssigned = await TaskAssignee.findOne({ where: { taskId: taskIdStr, userId: req.user!.userId } });
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only view attachments on tasks assigned to you' });
        return;
      }
    }

    const attachments = await Attachment.findAll({
      where: { taskId: taskIdStr },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
      attributes: { exclude: ['filePath'] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ message: 'Attachments fetched successfully', count: attachments.length, attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DOWNLOAD ATTACHMENT ────────────────────────────────
// GET /api/attachments/download/:attachmentId
export const downloadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;
    const attachmentIdStr = attachmentId as string;

    const attachment = await Attachment.findByPk(attachmentIdStr);
    if (!attachment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentIdStr}` });
      return;
    }

    if (req.user!.role === 'Collaborator') {
      const { default: TaskAssignee } = await import('../models/TaskAssignee');
      const isAssigned = await TaskAssignee.findOne({ where: { taskId: attachment.taskId, userId: req.user!.userId } });
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only download attachments from tasks assigned to you' });
        return;
      }
    }

    const normalizedPath = path.resolve(attachment.filePath);
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'File not found on server' });
      return;
    }

    res.download(normalizedPath, attachment.fileName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── REPLACE ATTACHMENT ─────────────────────────────────
// PUT /api/attachments/:attachmentId/replace
export const replaceAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;
    const attachmentIdStr = attachmentId as string;

    if (!req.file) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'No file was uploaded' });
      return;
    }

    const attachment = await Attachment.findByPk(attachmentIdStr);
    if (!attachment) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentIdStr}` });
      return;
    }

    // Collaborator can only replace their own uploads
    if (req.user!.role === 'Collaborator' && attachment.uploadedBy !== req.user!.userId) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only replace your own uploaded files' });
      return;
    }

    // Delete old file from disk
    const oldPath = path.resolve(attachment.filePath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    // Update record with new file details
    await attachment.update({
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });

    res.status(200).json({
      message: 'Attachment replaced successfully',
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Replace attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DELETE ATTACHMENT ──────────────────────────────────
// DELETE /api/attachments/:attachmentId
export const deleteAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;
    const attachmentIdStr = attachmentId as string;

    const attachment = await Attachment.findByPk(attachmentIdStr);
    if (!attachment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentIdStr}` });
      return;
    }

    // Collaborator can only delete their own uploads
    if (req.user!.role === 'Collaborator' && attachment.uploadedBy !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only delete your own uploaded files' });
      return;
    }

    const normalizedPath = path.resolve(attachment.filePath);
    if (fs.existsSync(normalizedPath)) fs.unlinkSync(normalizedPath);

    await attachment.destroy();
    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};
