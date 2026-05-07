# BFF - Backend For Frontend (API Gateway)

Backend For Frontend que sirve como API Gateway central para el sistema PawPet. Gestiona el proxy inverso, autenticación global y enrutamiento a microservicios.

## 🚀 Características

- ✅ **API Gateway** centralizado
- ✅ **Proxy inverso** para todos los microservicios
- ✅ **Autenticación global** con middleware JWT
- ✅ **Rate limiting** unificado
- ✅ **Logs centralizados** con Winston
- ✅ **Seguridad** con Helmet
- ✅ **Tests unitarios** con Jest
- ✅ **Contenerización** con Docker

## 📋 Arquitectura de Proxy

### Rutas de Autenticación (Sin Auth Required)
```
POST /api/auth/register     - Registrar usuario → ms-auth
POST /api/auth/login        - Login → ms-auth
POST /api/auth/refresh      - Refrescar token → ms-auth
```

### Rutas Protegidas (Con Auth Required)
```
# Pacientes → ms-patient
GET    /api/patients              - Listar pacientes
POST   /api/patients              - Crear paciente
GET    /api/patients/:id          - Obtener paciente
PUT    /api/patients/:id          - Actualizar paciente
DELETE /api/patients/:id          - Eliminar paciente

# Historial → ms-historial
POST /api/historial/consultations           - Crear consulta
GET  /api/historial/patient/:id/history    - Historial completo
POST /api/historial/vaccinations           - Crear vacuna
GET  /api/historial/vaccinations/patient/:id - Listar vacunas

# Verificación → ms-auth
GET  /api/auth/verify       - Verificar token
```

### Sistema
```
GET /health                 - Health check del BFF
```

## 🔧 Instalación

### Prerrequisitos
- Node.js 18+
- Servicios ms-auth, ms-patient, ms-historial funcionando

### Desarrollo Local
```bash
# Clonar repositorio
git clone <repository-url>
cd bff

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar en modo desarrollo
npm run dev
```

### Docker
```bash
# Construir imagen
docker build -t bff .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env bff
```

## ⚙️ Configuración

### Variables de Entorno
```bash
# Servidor
PORT=3000
NODE_ENV=development

# URLs de Microservicios
AUTH_SERVICE_URL=http://localhost:3001
PATIENT_SERVICE_URL=http://localhost:3002
HISTORIAL_SERVICE_URL=http://localhost:3003

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con coverage
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

## 🏗️ Arquitectura

```
src/
├── middleware/      # Middleware personalizado
│   ├── auth.js     # Autenticación global
│   └── errorHandler.js
├── utils/           # Utilidades (logger, etc.)
└── app.js           # Aplicación principal con proxy
```

## 🔒 Seguridad

- **Helmet**: Protección HTTP básica
- **Rate Limiting**: Límite global de peticiones
- **Autenticación Global**: Middleware JWT centralizado
- **Headers Personalizados**: Contexto de usuario para servicios
- **Timeouts**: Protección contra lentitud de servicios

## 📊 Logs

El BFF utiliza Winston para logging centralizado:

- **Niveles**: error, warn, info, debug
- **Salida**: Archivos y consola
- **Formato**: JSON con metadatos
- **Contexto**: Información de proxy y autenticación

## 🐳 Docker

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs en Contenedor
```bash
docker logs <container-id>
```

## 🔗 Integración con Microservicios

### Flujo de Autenticación
1. **Login**: `/api/auth/login` → ms-auth (sin auth)
2. **Token**: JWT retornado al cliente
3. **Request**: Cliente envía token en header
4. **BFF**: Verifica token con ms-auth
5. **Headers**: Agrega contexto de usuario
6. **Proxy**: Reenvía a servicio destino

### Headers de Contexto
```http
X-User-ID: 123
X-User-Email: user@example.com
X-User-Role: vet
Authorization: Bearer <jwt-token>
```

## 📝 API Documentation

### Login (Sin Autenticación)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Request Autenticado
```bash
GET /api/patients
Authorization: Bearer <jwt-token>
```

### Response del Proxy
El BFF reenvía directamente la respuesta del microservicio destino:

```json
{
  "success": true,
  "data": [...]
}
```

## 🚨 Errores Comunes

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access token is required"
}
```

### 503 - Service Unavailable
```json
{
  "success": false,
  "message": "Auth service unavailable"
}
```

### 504 - Gateway Timeout
```json
{
  "success": false,
  "message": "Authentication service timeout"
}
```

## 🔄 Flujo de Request

1. **Cliente** → BFF
2. **Auth Middleware** → Verifica JWT (excepto endpoints públicos)
3. **Context Headers** → Agrega información de usuario
4. **Proxy** → Reenvía a microservicio correspondiente
5. **Response** → Reenvía respuesta al cliente
6. **Logging** → Registra operación

## 📈 Monitoreo

- Health checks automáticos
- Rate limiting global
- Logs centralizados con contexto
- Métricas de proxy
- Timeout de servicios
- Estado de microservicios

## 🛠️ Configuración de Proxy

### Agregar Nuevo Microservicio
```javascript
const newServiceProxy = createProxyMiddleware({
  target: 'http://new-service:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/new-service': '/api'
  },
  onError: (err, req, res) => {
    logger.error('New service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'New service unavailable'
    });
  }
});

app.use('/api/new-service', newServiceProxy);
```

### Configuración de Timeout
```javascript
const authResponse = await axios.get(
  `${process.env.AUTH_SERVICE_URL}/api/auth/verify`,
  {
    headers: { 'Authorization': `Bearer ${token}` },
    timeout: 5000 // 5 segundos
  }
);
```

## 🔄 Estrategias de Resiliencia

### Circuit Breaker
```javascript
let authServiceHealthy = true;

const checkAuthService = async () => {
  try {
    await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 3000 });
    authServiceHealthy = true;
  } catch (error) {
    authServiceHealthy = false;
    logger.error('Auth service health check failed:', error);
  }
};
```

### Retry Logic
```javascript
const retryRequest = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## 🚀 Deploy

### Producción
```bash
# Build para producción
npm run build

# Start en producción
npm start

# Con PM2
pm2 start src/app.js --name bff
```

### Docker Compose
```yaml
services:
  bff:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AUTH_SERVICE_URL=http://ms-auth:3001
      - PATIENT_SERVICE_URL=http://ms-patient:3002
      - HISTORIAL_SERVICE_URL=http://ms-historial:3003
    depends_on:
      - ms-auth
      - ms-patient
      - ms-historial
```

## 📊 Métricas y Monitoring

### endpoints Monitoreados
- Health checks de todos los servicios
- Rate limiting por IP
- Tiempo de respuesta de proxy
- Errores de autenticación
- Timeouts de servicios

### Logs Importantes
- Autenticaciones exitosas
- Fallos de autenticación
- Caídas de servicios
- Requests lentos
- Rate limiting activado

## 🔧 Troubleshooting

### Servicio No Responde
```bash
# Verificar estado
curl http://localhost:3000/health

# Verificar logs
docker logs bff

# Verificar conexión a servicios
curl http://localhost:3001/health  # ms-auth
curl http://localhost:3002/health  # ms-patient
curl http://localhost:3003/health  # ms-historial
```

### Problemas de Autenticación
```bash
# Verificar token manualmente
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/patients
```

## 📄 Licencia

MIT License

## 👥 Maintainers

PawPet Development Team
