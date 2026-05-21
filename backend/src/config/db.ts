import { Sequelize, Options } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// Detect if connecting to Azure MySQL
// Azure requires SSL but local MySQL does not
const isAzure: boolean = !!(process.env.DB_HOST && process.env.DB_HOST.includes('azure.com'));

// Build dialect options based on environment
const dialectOptions: Record<string, any> = {
  charset: 'utf8mb4'
};

if (isAzure) {
  // Azure MySQL requires SSL with certificate verification
  dialectOptions.ssl = {
    rejectUnauthorized: true
  };
} else {
  // Local MySQL does not need SSL
  dialectOptions.ssl = false;
}

const sequelizeOptions: Options = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  dialect: 'mysql',
  logging: false,
  dialectOptions,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASS as string,
  sequelizeOptions
);

export default sequelize;
