import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import sequelize from './config/db';
import User from './models/User';

// This script creates the first Admin user manually
// Run it with: npm run seed
// After running once, you do not need to run it again

const createAdmin = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await User.sync();

    // Check if admin already exists to avoid duplicates
    const existing = await User.findOne({ where: { email: 'admin@tms.com' } });
    if (existing) {
      console.log('Admin already exists. Skipping.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@1234', 10);

    await User.create({
      name: 'System Admin',
      email: 'admin@tms.com',
      password: hashedPassword,
      role: 'Admin',
      isActive: true,
      mustChangePassword: false // Admin does not need to change on first login
    });

    console.log('Admin created successfully!');
    console.log('Email: admin@tms.com');
    console.log('Password: Admin@1234');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();