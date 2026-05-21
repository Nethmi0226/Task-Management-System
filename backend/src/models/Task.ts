import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

export interface TaskAttributes {
  id: number;
  title: string;
  description: string | null;
  createdBy: number;
  dueDate: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Completed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'description' | 'dueDate' | 'priority' | 'status'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public createdBy!: number;
  public dueDate!: string | null;
  public priority!: 'Low' | 'Medium' | 'High';
  public status!: 'To Do' | 'In Progress' | 'Completed';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Who created this task
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' }
    },

    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium'
    },

    status: {
      type: DataTypes.ENUM('To Do', 'In Progress', 'Completed'),
      defaultValue: 'To Do'
    }
  },
  {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: true
  }
);

// Task belongs to a creator
Task.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

export default Task;
