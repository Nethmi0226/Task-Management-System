import { Response } from 'express';
import { Op } from 'sequelize';
import Task from '../models/Task';
import TaskAssignee from '../models/TaskAssignee';
import User from '../models/User';
import { sendTaskAssignmentEmail } from '../utils/emailService';
import { sendNotification, sendNotificationToMany } from '../utils/socketManager';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

// Helper to get io instance from app
const getIO = (req: AuthenticatedRequest): Server => req.app.get('io') as Server;

// ── CREATE TASK ────────────────────────────────────────
// POST /api/tasks
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, assigneeIds, dueDate, priority, status } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Task title is required' });
      return;
    }
    if (title.trim().length < 3) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Title must be at least 3 characters' });
      return;
    }
    if (title.trim().length > 200) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Title cannot exceed 200 characters' });
      return;
    }

    if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Priority must be Low, Medium, or High' });
      return;
    }

    if (status && !['To Do', 'In Progress', 'Completed'].includes(status)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Status must be To Do, In Progress, or Completed' });
      return;
    }

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(dueDate) < today) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Due date cannot be in the past' });
        return;
      }
    }

    // Validate all assignee IDs if provided
    let validAssignees: User[] = [];
    if (assigneeIds && assigneeIds.length > 0) {
      validAssignees = await User.findAll({
        where: { id: { [Op.in]: assigneeIds }, isActive: true }
      });
      if (validAssignees.length !== assigneeIds.length) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'One or more assigned users do not exist or are inactive' });
        return;
      }
    }

    const task = await Task.create({
      title:       title.trim(),
      description: description ? description.trim() : null,
      createdBy:   req.user!.userId,
      dueDate:     dueDate || null,
      priority:    priority || 'Medium',
      status:      status  || 'To Do'
    });

    // Create TaskAssignee records for each assignee
    if (validAssignees.length > 0) {
      const assigneeRecords = validAssignees.map(u => ({ taskId: task.id, userId: u.id }));
      await TaskAssignee.bulkCreate(assigneeRecords);

      const creator = await User.findByPk(req.user!.userId);
      const io      = getIO(req);

      for (const assignee of validAssignees) {
        try {
          await sendTaskAssignmentEmail(assignee.email, assignee.name, task, creator!.name);
        } catch (emailError: any) {
          console.error('Assignment email failed:', emailError.message);
        }
        await sendNotification(io, assignee.id, {
          title:   'New Task Assigned',
          message: `You have been assigned to task: ${task.title}`,
          type:    'task_assigned',
          taskId:  task.id
        });
      }
    }

    const taskWithAssignees = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } },
        { model: User, as: 'creator',   attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json({ message: 'Task created successfully', task: taskWithAssignees });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET ALL TASKS ──────────────────────────────────────
// GET /api/tasks
export const getAllTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, search } = req.query as Record<string, string>;
    const whereCondition: Record<string, any> = {};

    if (status)   whereCondition.status   = status;
    if (priority) whereCondition.priority = priority;
    if (search)   whereCondition.title    = { [Op.like]: `%${search}%` };

    let tasks: Task[];

    if (req.user!.role === 'Collaborator') {
      // Collaborator sees only tasks they are assigned to
      tasks = await Task.findAll({
        where: whereCondition,
        include: [
          {
            model:    User,
            as:       'assignees',
            attributes: ['id', 'name', 'email', 'role'],
            through:  { attributes: [] },
            where:    { id: req.user!.userId },
            required: true
          },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Admin and Project Manager see all tasks
      tasks = await Task.findAll({
        where: whereCondition,
        include: [
          { model: User, as: 'assignees', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } },
          { model: User, as: 'creator',   attributes: ['id', 'name', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.status(200).json({ message: 'Tasks fetched successfully', count: tasks.length, tasks });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET SINGLE TASK ────────────────────────────────────
// GET /api/tasks/:id
export const getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = String(req.params.id);

    const task = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } },
        { model: User, as: 'creator',   attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // Collaborator can only view tasks they are assigned to
    if (req.user!.role === 'Collaborator') {
      const assignees  = (task as any).assignees as User[];
      const isAssigned = assignees.some((a: User) => Number(a.id) === Number(req.user!.userId));
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only view tasks assigned to you' });
        return;
      }
    }

    // Project Manager can view any task (no restriction here)
    // Edit / delete restrictions are handled in updateTask and deleteTask

    res.status(200).json({ message: 'Task fetched successfully', task });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── UPDATE TASK ────────────────────────────────────────
// PUT /api/tasks/:id
// Admin:   can update any task, all fields
// PM:      creator of task → all fields | assignee but not creator → status only | neither → forbidden
// Collab:  assignee → status only | not assignee → forbidden
export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = String(req.params.id);
    const { title, description, dueDate, priority, status } = req.body;

    const task = await Task.findByPk(taskId, {
      include: [{ model: User, as: 'assignees', through: { attributes: [] } }]
    });

    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    const assignees     = (task as any).assignees as User[];
    const isPM          = req.user!.role === 'ProjectManager';
    const isCollaborator = req.user!.role === 'Collaborator';
    const isTaskCreator = task.createdBy === req.user!.userId;
    const isAssigned    = assignees.some((a: User) => Number(a.id) === Number(req.user!.userId));

    // Project Manager rules
    if (isPM) {
      if (!isTaskCreator && !isAssigned) {
        // PM has no connection to this task — forbidden
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only update tasks you created or are assigned to' });
        return;
      }
      if (!isTaskCreator && isAssigned) {
        // PM is assigned but not creator — status update only
        if (title !== undefined || description !== undefined || dueDate !== undefined || priority !== undefined) {
          res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only update the status of tasks you did not create' });
          return;
        }
      }
      // isTaskCreator → full edit allowed, fall through
    }

    // Collaborator rules
    if (isCollaborator) {
      if (!isAssigned) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only update tasks assigned to you' });
        return;
      }
      if (title !== undefined || description !== undefined || dueDate !== undefined || priority !== undefined) {
        res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only update the status of a task' });
        return;
      }
    }

    // Validate fields
    if (title !== undefined) {
      if (!title || !title.trim()) { res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Title cannot be empty' }); return; }
      if (title.trim().length < 3)   { res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Title must be at least 3 characters' }); return; }
      if (title.trim().length > 200) { res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Title cannot exceed 200 characters' }); return; }
    }

    if (priority !== undefined && !['Low', 'Medium', 'High'].includes(priority)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Priority must be Low, Medium, or High' });
      return;
    }

    if (status !== undefined && !['To Do', 'In Progress', 'Completed'].includes(status)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Status must be To Do, In Progress, or Completed' });
      return;
    }

    if (dueDate !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(dueDate) < today) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Due date cannot be in the past' });
        return;
      }
    }

    const oldStatus = task.status;

    await task.update({
      title:       title       ? title.trim() : task.title,
      description: description !== undefined  ? description : task.description,
      dueDate:     dueDate     !== undefined  ? dueDate     : task.dueDate,
      priority:    priority    || task.priority,
      status:      status      || task.status
    });

    // Send real-time notification if status changed
    if (status && status !== oldStatus) {
      const io         = getIO(req);
      const assigneeIds = assignees.map((a: User) => Number(a.id));
      await sendNotificationToMany(io, assigneeIds, {
        title:   'Task Status Updated',
        message: `Task "${task.title}" status changed from ${oldStatus} to ${status}`,
        type:    'status_changed',
        taskId:  task.id
      });
    }

    const updatedTask = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } },
        { model: User, as: 'creator',   attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── ADD MEMBERS TO TASK ────────────────────────────────
// POST /api/tasks/:id/members
export const addTaskMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = String(req.params.id);
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'userIds must be a non-empty array of user IDs' });
      return;
    }

    const task = await Task.findByPk(taskId, {
      include: [{ model: User, as: 'assignees', through: { attributes: [] } }]
    });

    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // PM can only add members to tasks they created
    if (req.user!.role === 'ProjectManager' && task.createdBy !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only manage members on tasks you created' });
      return;
    }

    const newUsers = await User.findAll({
      where: { id: { [Op.in]: userIds }, isActive: true }
    });

    if (newUsers.length !== userIds.length) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'One or more users do not exist or are inactive' });
      return;
    }

    const existingIds = ((task as any).assignees as User[]).map((a: User) => Number(a.id));
    const toAdd       = newUsers.filter(u => !existingIds.includes(Number(u.id)));

    if (toAdd.length === 0) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'All provided users are already assigned to this task' });
      return;
    }

    const records = toAdd.map(u => ({ taskId: parseInt(taskId, 10), userId: u.id }));
    await TaskAssignee.bulkCreate(records);

    const creator = await User.findByPk(req.user!.userId);
    const io      = getIO(req);

    for (const user of toAdd) {
      try {
        await sendTaskAssignmentEmail(user.email, user.name, task, creator!.name);
      } catch (emailError: any) {
        console.error('Assignment email failed:', emailError.message);
      }
      await sendNotification(io, user.id, {
        title:   'Added to Task',
        message: `You have been added to task: ${task.title}`,
        type:    'task_assigned',
        taskId:  task.id
      });
    }

    const updatedTask = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } },
        { model: User, as: 'creator',   attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(200).json({ message: `${toAdd.length} member(s) added to task successfully`, task: updatedTask });
  } catch (error) {
    console.error('Add task members error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── REMOVE MEMBER FROM TASK ────────────────────────────
// DELETE /api/tasks/:id/members/:userId
export const removeTaskMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId       = String(req.params.id);
    const memberUserId = String(req.params.userId);

    const task = await Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // PM can only remove members from tasks they created
    if (req.user!.role === 'ProjectManager' && task.createdBy !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only manage members on tasks you created' });
      return;
    }

    const assignee = await TaskAssignee.findOne({
      where: { taskId: parseInt(taskId, 10), userId: parseInt(memberUserId, 10) }
    });

    if (!assignee) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'This user is not assigned to this task' });
      return;
    }

    await assignee.destroy();
    res.status(200).json({ message: 'Member removed from task successfully' });
  } catch (error) {
    console.error('Remove task member error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DELETE TASK ────────────────────────────────────────
// DELETE /api/tasks/:id
// Manually cleans up all related records before deleting
// This works even if CASCADE is not set on the database foreign keys
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId    = String(req.params.id);
    const taskIdInt = parseInt(taskId, 10);

    const task = await Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No task found with ID ${taskId}` });
      return;
    }

    // Collaborator cannot delete any task
    if (req.user!.role === 'Collaborator') {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You do not have permission to delete tasks' });
      return;
    }

    // Project Manager can only delete tasks they created
    if (req.user!.role === 'ProjectManager' && task.createdBy !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You can only delete tasks you created' });
      return;
    }

    // ── Manual cascade cleanup ─────────────────────────
    // Ensures deletion works even if DB foreign keys are still NO ACTION
    const Comment      = (await import('../models/Comment')).default;
    const Attachment   = (await import('../models/Attachment')).default;
    const Notification = (await import('../models/Notification')).default;

    // 1. Delete physical attachment files from disk
    const attachments = await Attachment.findAll({ where: { taskId: taskIdInt } });
    for (const att of attachments) {
      try {
        const normalizedPath = path.resolve(att.filePath);
        if (fs.existsSync(normalizedPath)) fs.unlinkSync(normalizedPath);
      } catch (fileErr) {
        console.error('Failed to delete attachment file:', fileErr);
      }
    }

    // 2. Delete physical comment attachment files from disk
    const comments = await Comment.findAll({ where: { taskId: taskIdInt } });
    for (const c of comments) {
      if (c.commentFilePath) {
        try {
          const normalizedPath = path.resolve(c.commentFilePath);
          if (fs.existsSync(normalizedPath)) fs.unlinkSync(normalizedPath);
        } catch (fileErr) {
          console.error('Failed to delete comment file:', fileErr);
        }
      }
    }

    // 3. Delete all task assignee records
    await TaskAssignee.destroy({ where: { taskId: taskIdInt } });

    // 4. Delete all attachment records from DB
    await Attachment.destroy({ where: { taskId: taskIdInt } });

    // 5. Delete all comment records from DB
    await Comment.destroy({ where: { taskId: taskIdInt } });

    // 6. Delete all task-related notifications
    await Notification.destroy({ where: { taskId: taskIdInt } });

    // 7. Finally delete the task itself
    await task.destroy();

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({
      errorCode: 500,
      message: 'Internal Server Error',
      description: `Failed to delete task: ${error.message || 'Something went wrong on the server'}`
    });
  }
};

// ── MANUAL TRIGGER FOR TESTING ─────────────────────────
// GET /api/tasks/trigger-reminders
export const triggerReminders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { checkDeadlinesAndNotify } = require('../utils/taskScheduler');
    await checkDeadlinesAndNotify();
    res.status(200).json({ message: 'Deadline check triggered successfully' });
  } catch (error) {
    console.error('Trigger reminders error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};