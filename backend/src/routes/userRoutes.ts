import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  getTeamMembers
} from '../controllers/userController';
import { verifyToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// GET /api/users/team — Project Manager views non-admin users (read only)
// Must be placed BEFORE /:id route otherwise Express reads "team" as an ID
router.get('/team', verifyToken, requireRole('Admin', 'ProjectManager'), getTeamMembers);

// GET /api/users — Admin only
router.get('/', verifyToken, requireRole('Admin'), getAllUsers);

// GET /api/users/:id — Admin only
router.get('/:id', verifyToken, requireRole('Admin'), getUserById);

// PUT /api/users/:id — Admin only
router.put('/:id', verifyToken, requireRole('Admin'), updateUser);

// PATCH /api/users/:id/deactivate — Admin only
router.patch('/:id/deactivate', verifyToken, requireRole('Admin'), deactivateUser);

// PATCH /api/users/:id/activate — Admin only
router.patch('/:id/activate', verifyToken, requireRole('Admin'), activateUser);

// DELETE /api/users/:id — Admin only
router.delete('/:id', verifyToken, requireRole('Admin'), deleteUser);

export default router;
