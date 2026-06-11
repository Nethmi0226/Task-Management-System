import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management System API',
      version: '1.0.0',
      description: 'INTE 21323 Final Project — Full REST API documentation for the TMS backend'
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from the login endpoint'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Tell swagger-jsdoc where to find the route files with comments
  apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
