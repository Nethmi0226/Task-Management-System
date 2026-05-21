import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import Task from './Task';
import User from './User';

export interface CommentAttributes {
  id: number;
  content: string;
  taskId: number;
  userId: number;
  attachmentId: number | null;
  commentFileName: string | null;
  commentStoredFileName: string | null;
  commentFilePath: string | null;
  commentFileType: string | null;
  commentFileSize: number | null;
  isEdited: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CommentCreationAttributes extends Optional<CommentAttributes,
  'id' | 'attachmentId' | 'commentFileName' | 'commentStoredFileName' |
  'commentFilePath' | 'commentFileType' | 'commentFileSize' | 'isEdited'> {}

class Comment extends Model<CommentAttributes, CommentCreationAttributes> implements CommentAttributes {
  public id!: number;
  public content!: string;
  public taskId!: number;
  public userId!: number;
  public attachmentId!: number | null;
  public commentFileName!: string | null;
  public commentStoredFileName!: string | null;
  public commentFilePath!: string | null;
  public commentFileType!: string | null;
  public commentFileSize!: number | null;
  public isEdited!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // Comment text — supports emoji because database uses utf8mb4
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // Which task this comment belongs to
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Task, key: 'id' }
    },

    // Who wrote this comment
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' }
    },

    // Optional file attached directly to this comment
    attachmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },

    commentFileName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    commentStoredFileName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    commentFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    commentFileType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    commentFileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },

    // Track if comment was edited
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'Comment',
    tableName: 'comments',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
);

Comment.belongsTo(Task, { as: 'task', foreignKey: 'taskId' });
Comment.belongsTo(User, { as: 'author', foreignKey: 'userId' });

export default Comment;
