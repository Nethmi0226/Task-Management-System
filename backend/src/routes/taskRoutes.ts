import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  addTaskMembers,
  removeTaskMember,
  deleteTask,
  triggerReminders
} from '../controllers/taskController';
import { verifyToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task (Admin and Project Manager only)
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, priority, status, dueDate]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Design login page
 *               description:
 *                 type: string
 *                 example: Create a responsive login page
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *               status:
 *                 type: string
 *                 enum: [To Do, In Progress, Done]
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
router.post('/', verifyToken, requireRole('Admin', 'ProjectManager'), createTask);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (filtered by role)
 *     tags: [Tasks]
 *     description: Admin and ProjectManager see all tasks. Collaborator sees only assigned tasks.
 *     responses:
 *       200:
 *         description: List of task objects with assignees
 */
router.get('/', verifyToken, getAllTasks);

/**
 * @swagger
 * /api/tasks/trigger-reminders:
 *   get:
 *     summary: Manually trigger deadline reminder emails (Admin only)
 *     tags: [Tasks]
 *     description: Runs the same job as the daily 8AM scheduler. Useful for testing.
 *     responses:
 *       200:
 *         description: Reminders triggered successfully
 *       403:
 *         description: Forbidden
 */
router.get('/trigger-reminders', verifyToken, requireRole('Admin'), triggerReminders);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task object with assignees and creator
 *       404:
 *         description: Task not found
 *       403:
 *         description: Forbidden — Collaborator trying to access unassigned task
 */
router.get('/:id', verifyToken, getTaskById);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task fields
 *     tags: [Tasks]
 *     description: Admin can update all fields. ProjectManager can update own tasks. Collaborator can only update status on assigned tasks.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *               status:
 *                 type: string
 *                 enum: [To Do, In Progress, Done]
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.put('/:id', verifyToken, updateTask);

/**
 * @swagger
 * /api/tasks/{id}/members:
 *   post:
 *     summary: Add members to a task (Admin and Project Manager only)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3]
 *     responses:
 *       200:
 *         description: Members added successfully
 *       404:
 *         description: Task not found
 */
router.post('/:id/members', verifyToken, requireRole('Admin', 'ProjectManager'), addTaskMembers);

/**
 * @swagger
 * /api/tasks/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a task (Admin and Project Manager only)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       404:
 *         description: Task or user not found
 */
router.delete('/:id/members/:userId', verifyToken, requireRole('Admin', 'ProjectManager'), removeTaskMember);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task and all related data (Admin and Project Manager only)
 *     tags: [Tasks]
 *     description: Deletes the task along with all assignees, comments, attachments, and notifications.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Forbidden — ProjectManager trying to delete another user's task
 *       404:
 *         description: Task not found
 */
router.delete('/:id', verifyToken, requireRole('Admin', 'ProjectManager'), deleteTask);

export default router;
