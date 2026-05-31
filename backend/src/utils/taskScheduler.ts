import cron from 'node-cron';
import { Op } from 'sequelize';
import Task from '../models/Task';
import User from '../models/User';
import TaskAssignee from '../models/TaskAssignee';
import Notification from '../models/Notification';
import {
  sendDeadlineReminderEmail,
  sendUrgentReminderEmail,
  sendFinalWarningEmail
} from './emailService';

// Helper function to get a date that is X days from today
// Returns the date as a string like "2026-06-01"
const getDateDaysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Main function that checks all tasks and sends reminders
export const checkDeadlinesAndNotify = async (): Promise<void> => {
  try {
    console.log('Running deadline check:', new Date().toLocaleString());

    const today = getDateDaysFromNow(0);
    const oneDayLater = getDateDaysFromNow(1);
    const threeDaysLater = getDateDaysFromNow(3);

    // Find all incomplete tasks with approaching deadlines
    // that are assigned to someone
    const taskAssignees = await TaskAssignee.findAll({
      include: [
        {
          model: Task,
          as: 'task',
          where: {
            status: { [Op.in]: ['To Do', 'In Progress'] },
            dueDate: { [Op.in]: [today, oneDayLater, threeDaysLater] }
          }
        },
        {
          model: User,
          as: 'assignee',
          where: { isActive: true },
          attributes: ['id', 'name', 'email']
        }
      ]
    } as any);

    // Also get incomplete tasks with due dates
    const incompleteTasks = await Task.findAll({
      where: {
        status: { [Op.in]: ['To Do', 'In Progress'] },
        dueDate: { [Op.in]: [today, oneDayLater, threeDaysLater] }
      }
    });

    for (const task of incompleteTasks) {
      // Get all assignees for this task
      const assignees = await TaskAssignee.findAll({
        where: { taskId: task.id },
        include: [{
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email']
        }]
      } as any);

      for (const assigneeRecord of assignees) {
        const assignee = (assigneeRecord as any).assignee;
        if (!assignee) continue;

        const userName: string = assignee.name;
        const userEmail: string = assignee.email;
        const taskData = {
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate as string,
          status: task.status
        };

        if (task.dueDate === today) {
          console.log(`Sending final warning to ${userEmail} for task: ${task.title}`);
          await sendFinalWarningEmail(userEmail, userName, taskData);
        } else if (task.dueDate === oneDayLater) {
          console.log(`Sending urgent reminder to ${userEmail} for task: ${task.title}`);
          await sendUrgentReminderEmail(userEmail, userName, taskData);
        } else if (task.dueDate === threeDaysLater) {
          console.log(`Sending 3-day reminder to ${userEmail} for task: ${task.title}`);
          await sendDeadlineReminderEmail(userEmail, userName, taskData);
        }

        // Save deadline notification to database
        await Notification.create({
          userId: assignee.id,
          title: 'Task Deadline Reminder',
          message: `Task "${task.title}" is due on ${new Date(task.dueDate as string).toDateString()}`,
          type: 'deadline_approaching',
          taskId: task.id,
          isRead: false
        });
      }
    }

    console.log(`Deadline check complete. Processed ${incompleteTasks.length} tasks.`);

  } catch (error) {
    console.error('Deadline check error:', error);
  }
};

// Start the scheduler — runs every day at 8:00 AM
// Cron format: 'second minute hour day month weekday'
// '0 8 * * *' means: at minute 0, hour 8, every day
export const startScheduler = (): void => {
  cron.schedule('0 8 * * *', () => {
    checkDeadlinesAndNotify();
  });
  console.log('Task deadline scheduler started - runs daily at 8:00 AM');
};
