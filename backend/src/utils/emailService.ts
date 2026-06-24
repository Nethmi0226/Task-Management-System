import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// It uses Gmail to send emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Sends the welcome email to a newly created user
export const sendWelcomeEmail = async (
  toEmail: string,
  name: string,
  tempPassword: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Account Has Been Created',
    text: `Hello ${name}, your account has been created.\nUsername: ${toEmail}\nTemporary Password: ${tempPassword}\nPlease log in and change your password immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Welcome to the Planora System</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your account has been created by an Administrator.</p>
        <p>Please use the credentials below to log in:</p>
        <div style="background:#f4f4f4; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Username (Email):</strong> ${toEmail}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color:red;"><strong>Important:</strong> You will be required to
        change your password immediately after your first login.</p>
        <p>Do not share this email with anyone.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Send email to user when their account details are updated by Admin
export const sendAccountUpdateEmail = async (
  toEmail: string,
  name: string,
  updatedFields: Record<string, string>
): Promise<void> => {
  const changesList = Object.entries(updatedFields)
    .map(([field, value]) => `<li><strong>${field}:</strong> ${value}</li>`)
    .join('');

  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Account Has Been Updated',
    text: `Hello ${name}, your account details have been updated by an Administrator.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Your Account Has Been Updated</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>An Administrator has made the following changes to your account:</p>
        <ul style="background:#f4f4f4; padding:16px; border-radius:8px;">
          ${changesList}
        </ul>
        <p>If you did not expect these changes, please contact your Administrator immediately.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Send email to user when their account is deleted by Admin
export const sendAccountDeletedEmail = async (
  toEmail: string,
  name: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Account Has Been Removed',
    text: `Hello ${name}, your account has been permanently removed by an Administrator.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Your Account Has Been Removed</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Planora System account has been <strong style="color:red;">permanently removed</strong> by an Administrator.</p>
        <p>If you believe this was a mistake, please contact your system administrator.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email sent immediately when a task is assigned to a user
export const sendTaskAssignmentEmail = async (
  toEmail: string,
  userName: string,
  task: { title: string; description: string | null; priority: string; dueDate: string | null; status: string },
  assignedBy: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `New Task Assigned: ${task.title}`,
    text: `Hello ${userName}, a new task has been assigned to you.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>New Task Assigned to You</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>A new task has been assigned to you by <strong>${assignedBy}</strong>.</p>
        <div style="background:#f4f4f4; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Task Title:</strong> ${task.title}</p>
          <p><strong>Description:</strong> ${task.description || 'No description provided'}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Deadline:</strong> ${task.dueDate ? new Date(task.dueDate).toDateString() : 'Not set'}</p>
          <p><strong>Status:</strong> ${task.status}</p>
        </div>
        <p>Please log in to the system to view your task details.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email sent 3 days before deadline — gentle reminder
export const sendDeadlineReminderEmail = async (
  toEmail: string,
  userName: string,
  task: { title: string; priority: string; dueDate: string; status: string }
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Reminder: Task "${task.title}" is due in 3 days`,
    text: `Hello ${userName}, your task is due in 3 days.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Task Deadline Reminder</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>This is a friendly reminder that the following task is due in <strong>3 days</strong>.</p>
        <div style="background:#fff3cd; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Task Title:</strong> ${task.title}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Deadline:</strong> ${new Date(task.dueDate).toDateString()}</p>
          <p><strong>Current Status:</strong> ${task.status}</p>
        </div>
        <p>Please make sure to complete this task before the deadline.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email sent 1 day before deadline — urgent reminder
export const sendUrgentReminderEmail = async (
  toEmail: string,
  userName: string,
  task: { title: string; priority: string; dueDate: string; status: string }
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Urgent: Task "${task.title}" is due TOMORROW`,
    text: `Hello ${userName}, your task is due tomorrow.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2 style="color:#e65c00;">Urgent Task Reminder</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your task is due <strong style="color:#e65c00;">tomorrow</strong>. Please prioritise completing it today.</p>
        <div style="background:#ffe0cc; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Task Title:</strong> ${task.title}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Deadline:</strong> ${new Date(task.dueDate).toDateString()}</p>
          <p><strong>Current Status:</strong> ${task.status}</p>
        </div>
        <p>Log in immediately to update your task progress.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email sent on the actual deadline day — final warning
export const sendFinalWarningEmail = async (
  toEmail: string,
  userName: string,
  task: { title: string; priority: string; dueDate: string; status: string }
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Final Warning: Task "${task.title}" is due TODAY`,
    text: `Hello ${userName}, your task is due today.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2 style="color:#cc0000;">Final Deadline Warning</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>This is your final warning. The following task is due <strong style="color:#cc0000;">TODAY</strong>.</p>
        <div style="background:#ffcccc; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Task Title:</strong> ${task.title}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Deadline:</strong> ${new Date(task.dueDate).toDateString()}</p>
          <p><strong>Current Status:</strong> ${task.status}</p>
        </div>
        <p style="color:#cc0000;"><strong>Please complete and update this task immediately.</strong></p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Security notification email sent when user changes their own password
export const sendPasswordChangedEmail = async (
  toEmail: string,
  name: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Password Has Been Changed',
    text: `Hello ${name}, your password was recently changed.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Password Changed Successfully</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Planora System password was successfully changed.</p>
        <div style="background:#fff3cd; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Time of change:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color:red;"><strong>If you did not make this change, please contact
        your Administrator immediately.</strong></p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email 1 — sent when user requests password reset, contains the clickable reset link
export const sendPasswordResetLinkEmail = async (
  toEmail: string,
  name: string,
  resetLink: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset Your Planora Password',
    text: `Hello ${name}, click this link to reset your password: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your Planora System password.</p>
        <p>Click the button below to reset your password.
        This link will expire in <strong>15 minutes</strong>.</p>
        <div style="text-align:center; margin:24px 0;">
          <a href="${resetLink}"
             style="background:#0078d4; color:#ffffff; padding:12px 24px;
                    border-radius:6px; text-decoration:none; font-size:16px;">
            Reset My Password
          </a>
        </div>
        <p style="color:#666; font-size:13px;">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="color:#666; font-size:13px; word-break:break-all;">
          ${resetLink}
        </p>
        <p style="color:red;"><strong>If you did not request a password reset,
        please ignore this email. Your password will not change.</strong></p>
        <p style="color:#666; font-size:12px;">
          This link expires at ${new Date(Date.now() + 15 * 60 * 1000).toLocaleString()}
        </p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email 2 — sent after password reset is completed successfully
export const sendPasswordResetSuccessEmail = async (
  toEmail: string,
  name: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Password Has Been Reset Successfully',
    text: `Hello ${name}, your password has been reset successfully.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Password Reset Successful</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Planora System password has been
        <strong>successfully reset</strong>.</p>
        <div style="background:#d4edda; padding:16px; border-radius:8px; margin:16px 0;">
          <p><strong>Time of reset:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You can now log in using your new password.</p>
        <p style="color:red;">
          <strong>If you did not reset your password, contact your
          Administrator immediately.</strong>
        </p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Email sent when admin deactivates a user account
export const sendDeactivationEmail = async (
  toEmail: string,
  name: string
): Promise<void> => {
  const mailOptions = {
    from: `"Planora System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Planora Account Has Been Deactivated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2 style="color:#e65c00;">Account Deactivated</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Planora System account has been <strong style="color:#e65c00;">deactivated</strong> by an Administrator.</p>
        <p>You will no longer be able to log in to the system.</p>
        <p>If you believe this was a mistake, please contact your Administrator immediately.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};
