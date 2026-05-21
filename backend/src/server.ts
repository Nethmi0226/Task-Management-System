import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import sequelize from './config/db';
import swaggerSpec from './config/swagger';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import commentRoutes from './routes/commentRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Import all models so Sequelize registers them before sync
import './models/User';
import './models/Task';
import './models/TaskAssignee';
import './models/Comment';
import './models/Attachment';
import './models/Notification';

const app = express();

// Create HTTP server from Express app
// This is needed so socket.io can share the same port
const server = http.createServer(app);

// Create socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in all controllers via req.app.get('io')
app.set('io', io);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files publicly
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Register all routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ message: 'TMS Backend is running!' });
});

const PORT: number = parseInt(process.env.PORT || '5000');

// Sync database safely
// Handles the duplicate foreign key issue across different MySQL versions
const syncDatabase = async (): Promise<void> => {
  try {
    // Try normal sync first — creates any missing tables
    await sequelize.sync({ force: false });
    console.log('Database synced successfully');
  } catch (syncError: any) {
    const errorCode = syncError.parent?.code || syncError.original?.code;
    const errorMsg  = syncError.message || '';

    if (errorCode === 'ER_FK_DUP_NAME' || errorMsg.includes('Duplicate foreign key')) {
      // Tables exist but have duplicate constraint names — safe to ignore
      console.log('Tables already exist — skipping table creation safely');
    } else if (errorCode === 'ER_NO_SUCH_TABLE') {
      // Some tables are missing — try to sync each model individually
      console.log('Some tables missing — attempting individual table sync...');
      const models = [
        require('./models/User').default,
        require('./models/Task').default,
        require('./models/TaskAssignee').default,
        require('./models/Comment').default,
        require('./models/Attachment').default,
        require('./models/Notification').default
      ];
      for (const model of models) {
        try {
          await model.sync({ force: false });
          console.log(`Synced: ${model.tableName}`);
        } catch (modelErr: any) {
          const mc = modelErr.parent?.code || modelErr.original?.code;
          if (mc === 'ER_FK_DUP_NAME') {
            console.log(`Table ${model.tableName} already exists — skipped`);
          } else {
            console.error(`Failed to sync ${model.tableName}:`, modelErr.message);
          }
        }
      }
    } else {
      throw syncError;
    }
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Step 1 — test connection
    await sequelize.authenticate();
    const isAzure = process.env.DB_HOST?.includes('azure.com');
    console.log(`Connected to ${isAzure ? 'Azure' : 'Local'} MySQL database`);

    // Step 2 — sync models
    await syncDatabase();

    // Step 3 — start WebSocket
    const { initializeSocket } = require('./utils/socketManager');
    initializeSocket(io);
    console.log('WebSocket server initialized');

    // Step 4 — start deadline scheduler
    const { startScheduler } = require('./utils/taskScheduler');
    startScheduler();
    console.log('Deadline scheduler started');

    // Step 5 — start HTTP server
    // Use server.listen instead of app.listen so socket.io shares the same port
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (err: any) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
