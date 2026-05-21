import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import Task from './Task';
import User from './User';

export interface AttachmentAttributes {
  id: number;
  fileName: string;
  storedFileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  taskId: number;
  uploadedBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, 'id'> {}

class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> implements AttachmentAttributes {
  public id!: number;
  public fileName!: string;
  public storedFileName!: string;
  public filePath!: string;
  public fileType!: string;
  public fileSize!: number;
  public taskId!: number;
  public uploadedBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // Original file name when user uploaded it
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // The file name we saved it as on the server (renamed to avoid conflicts)
    storedFileName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // The full path where file is saved on server
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // File type like image/jpeg, application/pdf
    fileType: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // File size in bytes
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Which task this attachment belongs to
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Task, key: 'id' }
    },

    // Who uploaded this file
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' }
    }
  },
  {
    sequelize,
    modelName: 'Attachment',
    tableName: 'attachments',
    timestamps: true
  }
);

Attachment.belongsTo(Task, { as: 'task', foreignKey: 'taskId' });
Attachment.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });

export default Attachment;
