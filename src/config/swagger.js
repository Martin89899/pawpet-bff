const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Configuración de Swagger para BFF (Backend for Frontend)
 * Documentación de API en español
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway - PawPet BFF',
      version: '1.0.0',
      description: 'Backend for Frontend (BFF) que actúa como gateway API para el sistema veterinario PawPet. Centraliza el acceso a todos los microservicios y proporciona una interfaz unificada para el frontend.',
      contact: {
        name: 'PawPet Team',
        email: 'support@pawpet.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo (Gateway Principal)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de acceso JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
