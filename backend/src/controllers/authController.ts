import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User';
import Notification from '../models/Notification';
import Comment from '../models/Comment';
import Attachment from '../models/Attachment';
import TaskAssignee from '../models/TaskAssignee';
import Task from '../models/Task';
import {
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendPasswordResetLinkEmail,
  sendPasswordResetSuccessEmail
} from '../utils/emailService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ── LOGIN ──────────────────────────────────────────────
// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(401).json({ errorCode: 401, message: 'Unauthorized', description: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ errorCode: 401, message: 'Unauthorized', description: 'Your account has been deactivated. Contact an administrator.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ errorCode: 401, message: 'Unauthorized', description: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── REGISTER (Admin only) ──────────────────────────────
// POST /api/auth/register
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Name, email, and role are all required' });
      return;
    }

    const allowedRoles = ['Admin', 'ProjectManager', 'Collaborator'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: `Role must be one of: ${allowedRoles.join(', ')}` });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'A user with this email already exists' });
      return;
    }

    // Generate a random temporary password
    const tempPassword = 'Tmp#' + Math.random().toString(36).slice(2, 9);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await User.create({ name, email, password: hashedPassword, role, mustChangePassword: true });

    try {
      await sendWelcomeEmail(email, name, tempPassword);
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError.message);
      res.status(201).json({
        message: 'User created but email could not be sent.',
        warning: 'Please manually share the temporary password with the user.',
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        temporaryPassword: tempPassword
      });
      return;
    }

    res.status(201).json({
      message: 'User created successfully. A welcome email has been sent.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── GET ALL USERS ──────────────────────────────────────
// GET /api/auth/users
// Accessible by: Admin, ProjectManager (all users); Collaborator (only Collaborators and ProjectManagers)
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingRole = req.user!.role;

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive'],
      order: [['name', 'ASC']],
    });

    // Admin sees everyone; ProjectManager and Collaborator see only non-Admin users
    const filtered = requestingRole === 'Admin'
      ? users
      : users.filter(u => u.role !== 'Admin');

    res.status(200).json({ users: filtered });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── DELETE USER (Admin only) ───────────────────────────
// DELETE /api/auth/users/:id
// Deletes all FK-referenced records first to avoid constraint violations
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);

    // Prevent admin from deleting themselves
    if (targetId === Number(req.user!.userId)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'You cannot delete your own account' });
      return;
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'User not found' });
      return;
    }

    // ── 1. Remove task assignee records (task_assignees / task_members table) ──
    await TaskAssignee.destroy({ where: { userId: targetId } });

    // ── 2. Delete tasks created by this user ──────────────────────────────────
    //    First remove assignees of those tasks, then the tasks themselves
    // Cast where clause to any to satisfy TypeScript when attribute name differs in TaskAttributes
    const createdTasks = await Task.findAll({ where: { creatorId: targetId } as any });
    const createdTaskIds = createdTasks.map((t: any) => t.id);
    if (createdTaskIds.length > 0) {
      await TaskAssignee.destroy({ where: { taskId: createdTaskIds } });
      // Nullify or cascade comments/attachments on those tasks
      await Comment.destroy({ where: { taskId: createdTaskIds } });
      await Attachment.destroy({ where: { taskId: createdTaskIds } });
      await Task.destroy({ where: { id: createdTaskIds } });
    }

    // ── 3. Delete notifications sent to or triggered by this user ────────────
    await Notification.destroy({ where: { userId: targetId } });

    // ── 4. Delete comments made by this user ─────────────────────────────────
    await Comment.destroy({ where: { userId: targetId } });

    // ── 5. Nullify uploadedBy on attachments this user uploaded to OTHER tasks ──
    //    Preserves the attachment/file on the task but removes the FK reference
    const otherTaskFilter: any = createdTaskIds.length > 0
      ? { uploadedBy: targetId, taskId: { [Op.notIn]: createdTaskIds } }
      : { uploadedBy: targetId };
    await (Attachment as any).update({ uploadedBy: null }, { where: otherTaskFilter });

    // ── 6. Finally delete the user ────────────────────────────────────────────
    await user.destroy();

    res.status(200).json({ message: `User "${user.name}" has been permanently deleted` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── CHANGE PASSWORD ────────────────────────────────────
// POST /api/auth/change-password
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!newPassword) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'New password is required' });
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)' });
      return;
    }

    const user = await User.findByPk(req.user!.userId);
    if (!user) {
      res.status(404).json({ errorCode: 404, message: 'Not Found', description: 'User not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword, mustChangePassword: false });

    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (emailError: any) {
      console.error('Password change notification email failed:', emailError.message);
    }

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── FORGOT PASSWORD ────────────────────────────────────
// POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Email address is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Please provide a valid email address' });
      return;
    }

    const user = await User.findOne({ where: { email: email.trim() } });

    if (!user || !user.isActive) {
      res.status(200).json({ message: 'If this email is registered, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await user.update({ resetToken, resetTokenExpiry });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetLinkEmail(user.email, user.name, resetLink);
    } catch (emailError: any) {
      console.error('Reset link email failed:', emailError.message);
      await user.update({ resetToken: null, resetTokenExpiry: null });
      res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Failed to send reset email. Please try again.' });
      return;
    }

    res.status(200).json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── VERIFY RESET TOKEN ─────────────────────────────────
// GET /api/auth/verify-reset-token/:token
export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset token is required' });
      return;
    }

    const user = await User.findOne({ where: { resetToken: token } });

    if (!user) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset link is invalid. Please request a new one.' });
      return;
    }

    if (new Date() > new Date(user.resetTokenExpiry as Date)) {
      await user.update({ resetToken: null, resetTokenExpiry: null });
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset link has expired. Please request a new one.' });
      return;
    }

    res.status(200).json({ message: 'Token is valid', email: user.email });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};

// ── RESET PASSWORD ─────────────────────────────────────
// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.params.token || req.body.token) as string;
    const newPassword = (req.body.password || req.body.newPassword) as string;

    if (!token) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset token is required' });
      return;
    }

    if (!newPassword) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'New password is required' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)' });
      return;
    }

    const user = await User.findOne({ where: { resetToken: token } });

    if (!user) {
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset link is invalid. Please request a new one.' });
      return;
    }

    if (new Date() > new Date(user.resetTokenExpiry as Date)) {
      await user.update({ resetToken: null, resetTokenExpiry: null });
      res.status(400).json({ errorCode: 400, message: 'Bad Request', description: 'Reset link has expired. Please request a new one.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      mustChangePassword: false
    });

    try {
      await sendPasswordResetSuccessEmail(user.email, user.name);
    } catch (emailError: any) {
      console.error('Reset success email failed:', emailError.message);
    }

    res.status(200).json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ errorCode: 500, message: 'Internal Server Error', description: 'Something went wrong on the server' });
  }
};