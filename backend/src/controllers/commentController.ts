import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import Comment from '../models/Comment';
import Task from '../models/Task';
import User from '../models/User';
import TaskAssignee from '../models/TaskAssignee';
import { sendNotificationToMany } from '../utils/socketManager';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Server } from 'socket.io';

// Helper to get io instance from app
const getIO = (req: AuthenticatedRequest): Server => req.app.get('io') as Server;

// Helper: safe file delete
const safeDeleteFile = (filePath: string | null): void => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    console.error('File delete error:', err.message);
  }
};

// Helper: check task access
// Returns the task if allowed, sends error response and returns null if not
const checkTaskAccess = async (
  taskId: string,
  user: { userId: number; role: string },
  res: Response
): Promise<Task | null> => {
  const task = await Task.findByPk(taskId);

  if (!task) {
    res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
    return null;
  }

  // Admin and Project Manager can access all tasks
  if (user.role === 'Admin' || user.role === 'ProjectManager') {
    return task;
  }

  // Collaborator — check TaskAssignee table only
  if (user.role === 'Collaborator') {
    const isAssigned = await TaskAssignee.findOne({
      where: { taskId: task.id, userId: user.userId }
    });

    if (isAssigned) return task;

    res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only interact with tasks assigned to you' });
    return null;
  }

  res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You do not have permission to access this task' });
  return null;
};

// ── ADD COMMENT ────────────────────────────────────────
// POST /api/comments/:taskId
// Send as multipart/form-data with content field and optional file field
export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskIdStr = taskId as string;
    const { content } = req.body;

    const hasContent = content && content.trim().length > 0;
    const hasFile = !!req.file;

    if (!hasContent && !hasFile) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Please enter a comment or attach a file' });
      return;
    }

    if (hasContent && content.trim().length > 2000) {
      safeDeleteFile(req.file?.path || null);
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Comment cannot exceed 2000 characters' });
      return;
    }

    const task = await checkTaskAccess(taskIdStr, req.user!, res);
    if (!task) {
      safeDeleteFile(req.file?.path || null);
      return;
    }

    const commentData: any = {
      content: hasContent ? content.trim() : '',
      taskId: parseInt(taskIdStr),
      userId: req.user!.userId,
      isEdited: false
    };

    if (hasFile && req.file) {
      commentData.commentFileName      = req.file.originalname;
      commentData.commentStoredFileName = req.file.filename;
      commentData.commentFilePath      = req.file.path;
      commentData.commentFileType      = req.file.mimetype;
      commentData.commentFileSize      = req.file.size;
    }

    const comment = await Comment.create(commentData);

    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] }],
      attributes: { exclude: ['commentFilePath'] }
    });

    // Send real-time notification to all task assignees except the commenter
    try {
      const io = getIO(req);
      const assignees = await TaskAssignee.findAll({ where: { taskId: task.id } });
      const assigneeIds = assignees
        .map(a => a.userId)
        .filter(uid => uid !== req.user!.userId);

      if (assigneeIds.length > 0) {
        await sendNotificationToMany(io, assigneeIds, {
          title: 'New Comment Added',
          message: `${(commentWithAuthor as any).author.name} commented on task: ${task.title}`,
          type: 'comment_added',
          taskId: task.id
        });
      }
    } catch (notifError: any) {
      console.error('Comment notification error:', notifError.message);
    }

    res.status(201).json({ message: 'Comment added successfully', comment: commentWithAuthor });
  } catch (error) {
    safeDeleteFile(req.file?.path || null);
    console.error('Add comment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET ALL COMMENTS FOR A TASK ────────────────────────
// GET /api/comments/:taskId
export const getCommentsByTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskIdStr = taskId as string;

    const task = await checkTaskAccess(taskIdStr, req.user!, res);
    if (!task) return;

    const comments = await Comment.findAll({
      where: { taskId: taskIdStr },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] }],
      attributes: { exclude: ['commentFilePath'] },
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({ message: 'Comments fetched successfully', count: comments.length, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── UPDATE COMMENT ─────────────────────────────────────
// PUT /api/comments/:commentId
// All roles — only own comments can be edited
export const updateComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const commentIdStr = commentId as string;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Comment content cannot be empty' });
      return;
    }

    if (content.trim().length > 2000) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Comment cannot exceed 2000 characters' });
      return;
    }

    const comment = await Comment.findByPk(commentIdStr);
    if (!comment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No comment found with ID ${commentIdStr}` });
      return;
    }

    // Nobody can edit another person's comment regardless of role
    if (comment.userId !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only edit your own comments' });
      return;
    }

    await comment.update({ content: content.trim(), isEdited: true });

    res.status(200).json({
      message: 'Comment updated successfully',
      comment: { id: comment.id, content: comment.content, isEdited: comment.isEdited, taskId: comment.taskId, userId: comment.userId, updatedAt: comment.updatedAt }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DELETE COMMENT ─────────────────────────────────────
// DELETE /api/comments/:commentId
export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const commentIdStr = commentId as string;

    const comment = await Comment.findByPk(commentIdStr);
    if (!comment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No comment found with ID ${commentIdStr}` });
      return;
    }

    // Collaborator can only delete their own comments
    if (req.user!.role === 'Collaborator' && comment.userId !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only delete your own comments' });
      return;
    }

    // Delete physical file if this comment had one attached
    safeDeleteFile(comment.commentFilePath);
    await comment.destroy();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── REMOVE COMMENT ATTACHMENT ──────────────────────────
// DELETE /api/comments/:commentId/attachment
export const removeCommentAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const commentIdStr = commentId as string;

    const comment = await Comment.findByPk(commentIdStr);
    if (!comment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'Comment not found' });
      return;
    }

    if (!comment.commentFilePath) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'This comment has no attachment' });
      return;
    }

    // Only comment author can remove their attachment
    if (comment.userId !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only remove attachments from your own comments' });
      return;
    }

    safeDeleteFile(comment.commentFilePath);

    await comment.update({
      commentFileName: null,
      commentStoredFileName: null,
      commentFilePath: null,
      commentFileType: null,
      commentFileSize: null
    });

    res.status(200).json({ message: 'Comment attachment removed successfully' });
  } catch (error) {
    console.error('Remove comment attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong' });
  }
};

// ── DOWNLOAD COMMENT ATTACHMENT ────────────────────────
// GET /api/comments/download/:commentId
// IMPORTANT: This route must be registered BEFORE /:taskId in the routes file
export const downloadCommentAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const commentIdStr = commentId as string;

    const comment = await Comment.findByPk(commentIdStr);
    if (!comment) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No comment found with ID ${commentIdStr}` });
      return;
    }

    if (!comment.commentFilePath) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'This comment does not have an attachment' });
      return;
    }

    const task = await checkTaskAccess(String(comment.taskId), req.user!, res);
    if (!task) return;

    const normalizedPath = path.resolve(comment.commentFilePath);
    if (!fs.existsSync(normalizedPath)) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'File not found on server. It may have been deleted.' });
      return;
    }

    res.download(normalizedPath, comment.commentFileName as string);
  } catch (error) {
    console.error('Download comment attachment error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};
