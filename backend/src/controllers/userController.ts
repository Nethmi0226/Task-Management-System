import { Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';
import {
  sendAccountUpdateEmail,
  sendAccountDeletedEmail,
  sendDeactivationEmail
} from '../utils/emailService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ── GET ALL USERS ──────────────────────────────────────
// GET /api/users
// Admin only — supports search and filter
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query  = req.query;
    const search = typeof query.search === 'string' ? query.search : '';
    const role   = typeof query.role   === 'string' ? query.role   : '';
    const status = typeof query.status === 'string' ? query.status : '';

    const whereCondition: Record<string, any> = {};

    if (search) {
      whereCondition[Op.or as any] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role)   whereCondition.role     = role;
    if (status) whereCondition.isActive = status === 'active';

    const users = await User.findAll({
      where: whereCondition,
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ message: 'Users fetched successfully', count: users.length, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET SINGLE USER ────────────────────────────────────
// GET /api/users/:id
export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Cast to string — req.params values are string | string[] in some TS configs
    const id = String(req.params.id);

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
    });

    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No user found with ID ${id}` });
      return;
    }

    res.status(200).json({ message: 'User fetched successfully', user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET TEAM MEMBERS (Project Manager view) ────────────
// GET /api/users/team
export const getTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query  = req.query;
    const search = typeof query.search === 'string' ? query.search : '';
    const role   = typeof query.role   === 'string' ? query.role   : '';

    const whereCondition: Record<string, any> = {
      role: { [Op.in]: ['ProjectManager', 'Collaborator'] },
      isActive: true
    };

    if (search) {
      whereCondition[Op.and as any] = [{
        [Op.or]: [
          { name:  { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      }];
    }

    if (role) {
      const allowedRoles = ['ProjectManager', 'Collaborator'];
      if (!allowedRoles.includes(role)) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Role filter must be ProjectManager or Collaborator' });
        return;
      }
      whereCondition.role = role;
    }

    const users = await User.findAll({
      where: whereCondition,
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      order: [['name', 'ASC']]
    });

    res.status(200).json({ message: 'Team members fetched successfully', count: users.length, users });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── UPDATE USER ────────────────────────────────────────
// PUT /api/users/:id
interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'Admin' | 'ProjectManager' | 'Collaborator';
  password?: string;
}

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id     = String(req.params.id);
    const { name, email, role } = req.body as UpdateUserRequest;

    // Block any attempt to update password through this endpoint
    if (req.body.password) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Password cannot be updated through this endpoint' });
      return;
    }

    if (!name && !email && !role) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Please provide at least one field to update: name, email, or role' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No user found with ID ${id}` });
      return;
    }

    // Admin cannot update another Admin account
    if (user.role === 'Admin' && user.id !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You cannot update another Admin account' });
      return;
    }

    if (!user.isActive) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Cannot update a deactivated user. Please activate them first.' });
      return;
    }

    // Validate name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Name cannot be empty' });
        return;
      }
      if (name.trim().length < 2) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Name must be at least 2 characters long' });
        return;
      }
      if (name.trim().length > 100) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Name cannot exceed 100 characters' });
        return;
      }
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(name.trim())) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Name can only contain letters and spaces' });
        return;
      }
    }

    // Validate email
    if (email !== undefined) {
      if (!email || !email.trim()) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Email cannot be empty' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Please provide a valid email address' });
        return;
      }
      if (email !== user.email) {
        const emailExists = await User.findOne({
          where: {
            email: email.trim(),
            // parseInt ensures the comparison is number vs number
            id: { [Op.ne]: parseInt(id, 10) }
          }
        });
        if (emailExists) {
          res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'This email is already used by another user' });
          return;
        }
      }
    }

    // Validate role
    if (role !== undefined) {
      if (!role || !role.trim()) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Role cannot be empty' });
        return;
      }
      const allowedRoles = ['Admin', 'ProjectManager', 'Collaborator'];
      if (!allowedRoles.includes(role)) {
        res.status(400).json({ errorCode: 400, message: 'Bad Request', description: `Role must be one of: ${allowedRoles.join(', ')}` });
        return;
      }
    }

    // Track what actually changed to include in the email
    const updatedFields: Record<string, string> = {};
    if (name  && name.trim()  !== user.name)  updatedFields['Name']  = name.trim();
    if (email && email.trim() !== user.email) updatedFields['Email'] = email.trim();
    if (role  && role         !== user.role)  updatedFields['Role']  = role;

    await user.update({
      name:  name  ? name.trim()  : user.name,
      email: email ? email.trim() : user.email,
      role:  role  || user.role
    });

    // Send update email only if something actually changed
    if (Object.keys(updatedFields).length > 0) {
      try {
        await sendAccountUpdateEmail(user.email, user.name, updatedFields);
      } catch (emailError: any) {
        console.error('Update email sending failed:', emailError.message);
      }
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DEACTIVATE USER ────────────────────────────────────
// PATCH /api/users/:id/deactivate
export const deactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id   = String(req.params.id);
    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No user found with ID ${id}` });
      return;
    }

    if (user.role === 'Admin' && user.id !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You cannot deactivate another Admin account' });
      return;
    }

    if (user.id === req.user!.userId) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'You cannot deactivate your own account' });
      return;
    }

    if (!user.isActive) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'This user is already deactivated' });
      return;
    }

    await user.update({ isActive: false });

    // Send deactivation email notification
    try {
      await sendDeactivationEmail(user.email, user.name);
    } catch (emailError: any) {
      console.error('Deactivation email failed:', emailError.message);
    }

    res.status(200).json({ message: `User ${user.name} has been deactivated successfully` });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── ACTIVATE USER ──────────────────────────────────────
// PATCH /api/users/:id/activate
export const activateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id   = String(req.params.id);
    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No user found with ID ${id}` });
      return;
    }

    if (user.isActive) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'This user is already active' });
      return;
    }

    await user.update({ isActive: true });
    res.status(200).json({ message: `User ${user.name} has been activated successfully` });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DELETE USER ────────────────────────────────────────
// DELETE /api/users/:id
// Manually cleans up all related records before deleting the user
// This works even if CASCADE is not yet set on the database foreign keys
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id     = String(req.params.id);
    const userId = parseInt(id, 10);

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: `No user found with ID ${id}` });
      return;
    }

    // Admin cannot delete another Admin account
    if (user.role === 'Admin' && user.id !== req.user!.userId) {
      res.status(403).json({ errorCode: 403, message: 'Forbidden', description: 'You cannot delete another Admin account' });
      return;
    }

    // Admin deleting their own account — check another Admin exists first
    if (user.id === req.user!.userId && user.role === 'Admin') {
      const otherAdminCount = await User.count({
        where: {
          role: 'Admin',
          isActive: true,
          id: { [Op.ne]: req.user!.userId }
        }
      });
      if (otherAdminCount === 0) {
        res.status(400).json({
          errorCode: 400,
          message: 'Bad Request',
          description: 'You cannot delete your own account because you are the only Admin. Please create another Admin first.'
        });
        return;
      }
    }

    const deletedUserEmail = user.email;
    const deletedUserName  = user.name;

    // ── Manual cascade cleanup ─────────────────────────
    // Cleans up all foreign key references before deleting the user
    // so deletion works regardless of DB FK configuration
    const TaskAssignee = (await import('../models/TaskAssignee')).default;
    const Notification = (await import('../models/Notification')).default;
    const Comment      = (await import('../models/Comment')).default;
    const Attachment   = (await import('../models/Attachment')).default;
    const Task         = (await import('../models/Task')).default;

    // 1. Remove this user from all task assignments
    await TaskAssignee.destroy({ where: { userId } });

    // 2. Delete all notifications for this user
    await Notification.destroy({ where: { userId } });

    // 3. Set userId to NULL on comments (keep comment text — do not delete it)
    await Comment.update({ userId: null as any }, { where: { userId } });

    // 4. Set uploadedBy to NULL on attachments (keep file records intact)
    await Attachment.update({ uploadedBy: null as any }, { where: { uploadedBy: userId } });

    // 5. Set createdBy to NULL on tasks (task stays, creator reference is cleared)
    await Task.update({ createdBy: null as any }, { where: { createdBy: userId } });

    // 6. Finally destroy the user record
    await user.destroy();

    // Send deletion notification email
    try {
      await sendAccountDeletedEmail(deletedUserEmail, deletedUserName);
    } catch (emailError: any) {
      console.error('Deletion email sending failed:', emailError.message);
    }

    res.status(200).json({ message: `User ${deletedUserName} has been permanently deleted` });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      errorCode: 500,
      message: 'Internal Server Error',
      description: `Failed to delete user: ${error.message || 'Something went wrong on the server'}`
    });
  }
};