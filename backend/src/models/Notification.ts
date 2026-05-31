import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'status_changed'
  | 'comment_added'
  | 'deadline_approaching'
  | 'general';

export interface NotificationAttributes {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  taskId: number | null;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'type' | 'taskId' | 'isRead'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: number;
  public userId!: number;
  public title!: string;
  public message!: string;
  public type!: NotificationType;
  public taskId!: number | null;
  public isRead!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // Who receives this notification
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' }
    },

    // Short title of the notification
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Full notification message
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // Type helps frontend show different icons
    type: {
      type: DataTypes.ENUM(
        'task_assigned',
        'task_updated',
        'status_changed',
        'comment_added',
        'deadline_approaching',
        'general'
      ),
      defaultValue: 'general'
    },

    // Link to the related task if any
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },

    // Whether user has seen this notification
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
);

Notification.belongsTo(User, { as: 'recipient', foreignKey: 'userId' });

export default Notification;
