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

// POST /api/tasks — Admin and Project Manager can create tasks
router.post('/', verifyToken, requireRole('Admin', 'ProjectManager'), createTask);

// GET /api/tasks — all roles can view (controller filters by role)
router.get('/', verifyToken, getAllTasks);

// GET /api/tasks/trigger-reminders — Admin only, for testing deadline emails
// Must be BEFORE /:id route otherwise Express reads "trigger-reminders" as an ID
router.get('/trigger-reminders', verifyToken, requireRole('Admin'), triggerReminders);

// GET /api/tasks/:id — all roles (controller handles permission check)
router.get('/:id', verifyToken, getTaskById);

// PUT /api/tasks/:id — all roles (controller restricts Collaborator to status only)
router.put('/:id', verifyToken, updateTask);

// POST /api/tasks/:id/members — Admin and Project Manager only
router.post('/:id/members', verifyToken, requireRole('Admin', 'ProjectManager'), addTaskMembers);

// DELETE /api/tasks/:id/members/:userId — Admin and Project Manager only
router.delete('/:id/members/:userId', verifyToken, requireRole('Admin', 'ProjectManager'), removeTaskMember);

// DELETE /api/tasks/:id — Admin and Project Manager only
router.delete('/:id', verifyToken, requireRole('Admin', 'ProjectManager'), deleteTask);

export default router;
