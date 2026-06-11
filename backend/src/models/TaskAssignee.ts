import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import Task from './Task';
import User from './User';

export interface TaskAssigneeAttributes {
  id: number;
  taskId: number;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskAssigneeCreationAttributes extends Optional<TaskAssigneeAttributes, 'id'> {}

// This table stores the many-to-many relationship between Tasks and Users
// One task can have many assignees
// One user can be assigned to many tasks
class TaskAssignee extends Model<TaskAssigneeAttributes, TaskAssigneeCreationAttributes> implements TaskAssigneeAttributes {
  public id!: number;
  public taskId!: number;
  public userId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TaskAssignee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Task, key: 'id' }
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' }
    }
  },
  {
    sequelize,
    modelName: 'TaskAssignee',
    tableName: 'taskassignees',
    timestamps: true
  }
);

// Set up associations
Task.belongsToMany(User, {
  through: TaskAssignee,
  as: 'assignees',
  foreignKey: 'taskId'
});

User.belongsToMany(Task, {
  through: TaskAssignee,
  as: 'assignedTasks',
  foreignKey: 'userId'
});

export default TaskAssignee;
