import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';

// Define the shape of User attributes
export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'ProjectManager' | 'Collaborator';
  isActive: boolean;
  mustChangePassword: boolean;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Fields that are optional when creating a new user
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'mustChangePassword' | 'resetToken' | 'resetTokenExpiry'> {}

// The User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'Admin' | 'ProjectManager' | 'Collaborator';
  public isActive!: boolean;
  public mustChangePassword!: boolean;
  public resetToken!: string | null;
  public resetTokenExpiry!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    // Auto-generated unique ID for each user
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // Full name of the user
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Email must be unique - no two users can have the same email
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true // Sequelize checks if it looks like an email
      }
    },

    // We NEVER store the real password here - only the bcrypt hash
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Role controls what the user can do in the system
    role: {
      type: DataTypes.ENUM('Admin', 'ProjectManager', 'Collaborator'),
      allowNull: false
    },

    // If false, user cannot log in (soft delete - data stays in DB)
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Forces user to change password on first login
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Stores the unique reset token when user requests password reset
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },

    // Stores when the reset token expires — token is only valid for 15 minutes
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
);

export default User;
