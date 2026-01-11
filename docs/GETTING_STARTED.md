# 🚀 Getting Started with TokenForge

> **From Zero to Identity Provider in 10 Minutes**

## 📋 Prerequisites

Before diving in, ensure you have:

- ✅ **Node.js** v20+ ([Download](https://nodejs.org/))
- ✅ **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **PostgreSQL Client** (optional, for database access)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Kimosabey/token-forge.git
cd token-forge
```

### Step 2: Start Infrastructure

```bash
# Start PostgreSQL + Redis containers
docker-compose up -d

# Verify containers are running
docker-compose ps
```

Expected output:
```
NAME                   STATUS          PORTS
tokenforge_db          Up 10 seconds   0.0.0.0:5432->5432/tcp
tokenforge_redis       Up 10 seconds   0.0.0.0:6379->6379/tcp
tokenforge_pgadmin     Up 10 seconds   0.0.0.0:5050->80/tcp
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Configure Environment

Create `.env` file in `backend/` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=tokenforge
DB_PASSWORD=secure_password_dev
DB_NAME=tokenforge_db
DB_SYNC=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Application
PORT=3000
NODE_ENV=development
```

⚠️ **Security Note**: Change `JWT_SECRET` to a strong random value in production!

### Step 5: Run the Application

```bash
npm run start:dev
```

🎉 **Success!** Your auth service is now running at `http://localhost:3000`

---

## 🧪 Verify Installation

### Test 1: Health Check

```bash
curl http://localhost:3000
```

Expected response:
```json
{
  "status": "healthy",
  "service": "TokenForge Auth Service",
  "version": "1.0.0"
}
```

### Test 2: OIDC Discovery

```bash
curl http://localhost:3000/.well-known/openid-configuration
```

You should see OIDC metadata with endpoints like:
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`

### Test 3: Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test 4: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

You'll receive:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

---

## 🗄️ Database Access

### Using pgAdmin (GUI)

1. Open browser: `http://localhost:5050`
2. Login:
   - Email: `admin@tokenforge.com`
   - Password: `admin`
3. Add Server:
   - Host: `db` (Docker network)
   - Port: `5432`
   - Username: `tokenforge`
   - Password: `secure_password_dev`

### Using psql (CLI)

```bash
docker exec -it tokenforge_db psql -U tokenforge -d tokenforge_db
```

Useful queries:
```sql
-- View all users
SELECT id, email, "firstName", "lastName", "isActive", "createdAt" 
FROM users;

-- View active sessions (Redis integration)
SELECT * FROM audit_logs 
WHERE event = 'LOGIN' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 🔍 Redis Inspection

```bash
# Connect to Redis
docker exec -it tokenforge_redis redis-cli

# View all refresh tokens
KEYS rt:*

# Check token details
GET rt:user123:token456

# Monitor real-time commands
MONITOR
```

---

## 🛠️ Development Workflow

### Running in Watch Mode

```bash
npm run start:dev
```

The server will automatically restart on code changes.

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Linting

```bash
# Check for issues
npm run lint

# Auto-fix
npm run lint:fix
```

### Building for Production

```bash
npm run build

# Run production build
npm run start:prod
```

---

## 📖 API Documentation

Once the server is running, access interactive API docs:

**Swagger UI**: `http://localhost:3000/api`

Here you can:
- 🔍 Browse all endpoints
- 🧪 Test API calls interactively
- 📋 View request/response schemas
- 🔐 Authenticate and test protected routes

---

## 🎯 Next Steps

Now that you're up and running, explore:

1. **📐 [ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into system design
2. **🔒 [SECURITY.md](./SECURITY.md)** - Security best practices
3. **⚠️ [FAILURE_SCENARIOS.md](./FAILURE_SCENARIOS.md)** - Resilience patterns
4. **💼 [INTERVIEW.md](./INTERVIEW.md)** - Technical interview prep

---

## 🐛 Troubleshooting

### Issue: Database Connection Failed

**Symptom**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart services
docker-compose restart db

# Check logs
docker-compose logs db
```

### Issue: Redis Connection Error

**Symptom**: `Error connecting to Redis`

**Solution**:
```bash
# Verify Redis is running
docker exec tokenforge_redis redis-cli PING
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

### Issue: Port Already in Use

**Symptom**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Or change port in .env
PORT=3001
```

### Issue: JWT Validation Failing

**Symptom**: `Invalid token signature`

**Solution**:
1. Ensure `JWT_SECRET` in `.env` matches between services
2. Clear Redis token cache: `redis-cli FLUSHDB`
3. Generate new tokens after secret change

---

## 🔧 Advanced Configuration

### Enabling HTTPS (Production)

Update `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - SSL_CERT_PATH=/certs/server.crt
      - SSL_KEY_PATH=/certs/server.key
    volumes:
      - ./certs:/certs:ro
```

Generate self-signed cert (dev only):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt
```

### Configuring CORS

In `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: ['https://yourapp.com', 'https://admin.yourapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

### Custom Token Expiry

In `.env`:
```env
# Shorter for high-security apps
JWT_ACCESS_EXPIRY=5m
JWT_REFRESH_EXPIRY=1d

# Longer for developer tools
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d
```

---

## 📊 Monitoring & Observability

### Health Check Endpoint

```bash
curl http://localhost:3000/health

# Response
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### Logs

```bash
# Application logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f db

# All logs
docker-compose logs -f
```

---

## 🚀 Production Deployment

### Docker Production Build

```bash
# Build optimized image
docker build -t tokenforge:latest ./backend

# Run with production env
docker run -d \
  --name tokenforge-prod \
  -p 3000:3000 \
  --env-file .env.production \
  tokenforge:latest
```

### Environment Variables Checklist

Before deploying:
- [ ] Change `JWT_SECRET` to cryptographically random value
- [ ] Set `DB_SYNC=false` (use migrations instead)
- [ ] Configure production database credentials
- [ ] Enable HTTPS/TLS
- [ ] Set `NODE_ENV=production`
- [ ] Configure external Redis (not Docker)
- [ ] Set up log aggregation
- [ ] Enable rate limiting
- [ ] Configure monitoring (Prometheus/Grafana)

---

## 💡 Tips & Best Practices

1. **🔑 Secret Management**: Use environment variables, never commit secrets to Git
2. **🔄 Database Migrations**: Use TypeORM migrations in production, not `synchronize`
3. **📝 Logging**: Use structured logging (Winston/Pino) for production
4. **🔒 Rate Limiting**: Enable aggressive rate limiting on auth endpoints
5. **🧪 Testing**: Maintain >80% code coverage
6. **📊 Monitoring**: Set up alerts for failed login attempts, token errors

---

## 🆘 Getting Help

- 📖 **Documentation**: [Full Docs](./README.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Kimosabey/token-forge/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Kimosabey/token-forge/discussions)

---

**Built with 💙 by Harshan Aiyappa** | [Portfolio](https://kimosabey.github.io) | [LinkedIn](https://linkedin.com/in/harshan-aiyappa)
