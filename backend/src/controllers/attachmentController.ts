import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Attachment from '../models/Attachment';
import Task from '../models/Task';
import User from '../models/User';
import TaskAssignee from '../models/TaskAssignee';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ── Helper: check if user can INTERACT with a task ─────
// Admin:        always allowed
// PM:           must be creator OR assignee
// Collaborator: must be assignee
const canInteractWithTask = async (
  taskId: string | number,
  user: { userId: number; role: string }
): Promise<boolean> => {
  if (user.role === 'Admin') return true;

  const task = await Task.findByPk(taskId);
  if (!task) return false;

  if (user.role === 'ProjectManager') {
    // PM can upload/replace/delete only if creator or assignee
    if (task.createdBy === user.userId) return true;
    const isAssigned = await TaskAssignee.findOne({
      where: { taskId: parseInt(String(taskId), 10), userId: user.userId }
    });
    return !!isAssigned;
  }

  if (user.role === 'Collaborator') {
    const isAssigned = await TaskAssignee.findOne({
      where: { taskId: parseInt(String(taskId), 10), userId: user.userId }
    });
    return !!isAssigned;
  }

  return false;
};

// ── UPLOAD ATTACHMENT ──────────────────────────────────
// POST /api/attachments/:taskId
export const uploadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = String(req.params.taskId);

    if (!req.file) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'No file was uploaded. Please select a file.' });
      return;
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // PM must be creator or assignee — Collaborator must be assignee
    const allowed = await canInteractWithTask(taskId, req.user!);
    if (!allowed) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only upload files on tasks you created or are assigned to' });
      return;
    }

    const attachment = await Attachment.create({
      fileName:       req.file.originalname,
      storedFileName: req.file.filename,
      filePath:       req.file.path,
      fileType:       req.file.mimetype,
      fileSize:       req.file.size,
      taskId:         parseInt(taskId, 10),
      uploadedBy:     req.user!.userId
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
// PM can view attachments on any task (read access)
// Collaborator must be assigned
export const getAttachmentsByTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = String(req.params.taskId);

    const task = await Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // PM can view any task's attachments — no restriction
    // Collaborator must be assigned
    if (req.user!.role === 'Collaborator') {
      const isAssigned = await TaskAssignee.findOne({
        where: { taskId: parseInt(taskId, 10), userId: req.user!.userId }
      });
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only view attachments on tasks assigned to you' });
        return;
      }
    }

    const attachments = await Attachment.findAll({
      where: { taskId: parseInt(taskId, 10) },
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
// PM can download from any task (view access)
// Collaborator must be assigned
export const downloadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const attachmentId = String(req.params.attachmentId);

    const attachment = await Attachment.findByPk(attachmentId);
    if (!attachment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentId}` });
      return;
    }

    // PM can download from any task — no restriction
    // Collaborator must be assigned to the task
    if (req.user!.role === 'Collaborator') {
      const isAssigned = await TaskAssignee.findOne({
        where: { taskId: attachment.taskId, userId: req.user!.userId }
      });
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only download files from tasks assigned to you' });
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
    const attachmentId = String(req.params.attachmentId);

    if (!req.file) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'No file was uploaded' });
      return;
    }

    const attachment = await Attachment.findByPk(attachmentId);
    if (!attachment) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentId}` });
      return;
    }

    // Must have interaction access to the task
    const allowed = await canInteractWithTask(attachment.taskId, req.user!);
    if (!allowed) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You do not have permission to replace files on this task' });
      return;
    }

    // Non-admin can only replace their own uploads
    if (req.user!.role !== 'Admin' && attachment.uploadedBy !== req.user!.userId) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only replace files you uploaded' });
      return;
    }

    // Delete old file from disk
    const oldPath = path.resolve(attachment.filePath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    // Update record with new file details
    await attachment.update({
      fileName:       req.file.originalname,
      storedFileName: req.file.filename,
      filePath:       req.file.path,
      fileType:       req.file.mimetype,
      fileSize:       req.file.size
    });

    res.status(200).json({
      message: 'Attachment replaced successfully',
      attachment: {
        id:       attachment.id,
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
    const attachmentId = String(req.params.attachmentId);

    const attachment = await Attachment.findByPk(attachmentId);
    if (!attachment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No attachment found with ID ${attachmentId}` });
      return;
    }

    // Must have interaction access to the task
    const allowed = await canInteractWithTask(attachment.taskId, req.user!);
    if (!allowed) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You do not have permission to delete files on this task' });
      return;
    }

    // Non-admin can only delete their own uploads
    if (req.user!.role !== 'Admin' && attachment.uploadedBy !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only delete files you uploaded' });
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