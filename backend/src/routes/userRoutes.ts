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

/**
 * @swagger
 * /api/users/team:
 *   get:
 *     summary: Get active non-admin team members
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of active ProjectManager and Collaborator users
 *       403:
 *         description: Forbidden
 */
router.get('/team',
  verifyToken,
  requireRole('Admin', 'ProjectManager'),
  getTeamMembers
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with optional search and filter (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Admin, ProjectManager, Collaborator]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by account status
 *     responses:
 *       200:
 *         description: List of users (passwords excluded)
 *       403:
 *         description: Forbidden
 */
router.get('/',
  verifyToken,
  requireRole('Admin'),
  getAllUsers
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a single user by ID (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
router.get('/:id',
  verifyToken,
  requireRole('Admin'),
  getUserById
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user name, email, or role (Admin only)
 *     tags: [Users]
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
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 example: jane@tms.com
 *               role:
 *                 type: string
 *                 enum: [Admin, ProjectManager, Collaborator]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put('/:id',
  verifyToken,
  requireRole('Admin'),
  updateUser
);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user account (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       400:
 *         description: User already deactivated
 *       404:
 *         description: User not found
 */
router.patch('/:id/deactivate',
  verifyToken,
  requireRole('Admin'),
  deactivateUser
);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate a deactivated user account (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User activated successfully
 *       400:
 *         description: User already active
 *       404:
 *         description: User not found
 */
router.patch('/:id/activate',
  verifyToken,
  requireRole('Admin'),
  activateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Permanently delete a user and all related data (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete the only Admin account
 *       404:
 *         description: User not found
 */
router.delete('/:id',
  verifyToken,
  requireRole('Admin'),
  deleteUser
);

export default router;
