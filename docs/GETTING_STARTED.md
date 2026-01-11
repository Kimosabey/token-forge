# 🚀 TokenForge - Quick Start Guide

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

---

## 🏃 Quick Start (Development)

### 1️⃣ Clone & Install

```bash
# Clone repository
git clone https://github.com/Kimosabey/token-forge.git
cd token-forge

# Install backend dependencies
cd backend
npm install
```

### 2️⃣ Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update JWT_SECRET for production
# Default values work fine for development
```

### 3️⃣ Start Infrastructure

```bash
# From project root, start PostgreSQL + Redis + pgAdmin
cd ..
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                  STATUS         PORTS
tokenforge_db         Up            0.0.0.0:5432->5432/tcp
tokenforge_redis      Up            0.0.0.0:6379->6379/tcp
tokenforge_pgadmin    Up            0.0.0.0:5050->80/tcp
```

### 4️⃣ Run Backend

```bash
# From backend directory
cd backend
npm run start:dev
```

You should see:
```
🚀 TokenForge Auth Service running on: http://localhost:3000/api
📚 Health Check: http://localhost:3000/api/auth/health
✅ Redis connected successfully
✅ Database connected successfully
```

---

## 🧪 Test the API

### Health Check

```bash
curl http://localhost:3000/api/auth/health
```

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "johndoe",
    "password": "SecurePass123!"
  }'
```

### Get Profile (Protected Route)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login/register response
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 🔍 Database Access

### pgAdmin (Web UI)

1. Open browser: http://localhost:5050
2. Login with:
   - Email: `admin@tokenforge.com`
   - Password: `admin`
3. Add server:
   - Name: TokenForge
   - Host: `db` (or `host.docker.internal` on Windows/Mac)
   - Port: `5432`
   - Username: `tokenforge`
   - Password: `secure_password_dev`
   - Database: `tokenforge_db`

### Direct PostgreSQL Connection

```bash
# Using psql
psql -h localhost -U tokenforge -d tokenforge_db

# Password: secure_password_dev
```

---

## 📊 View Data

After registering/logging in, check the database:

```sql
-- View users
SELECT id, username, email, "isActive", "emailVerified" FROM users;

-- View roles
SELECT * FROM roles;

-- View user-role mappings
SELECT * FROM user_roles;

-- View sessions
SELECT id, "userId", "isActive", "expiresAt" FROM sessions;

-- View audit logs
SELECT "userId", action, success, "ipAddress", "createdAt" FROM audit_logs;
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Kill the process or change PORT in .env
```

### Docker Services Not Starting

```bash
# Stop all containers
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart
docker-compose up -d
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Redis Connection Failed

```bash
# Check Redis status
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

---

## 🎯 API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register new user |
| `POST` | `/api/auth/login` | ❌ | Login user |
| `POST` | `/api/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/api/auth/logout` | ✅ | Logout current session |
| `POST` | `/api/auth/logout-all` | ✅ | Logout all sessions |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |
| `GET` | `/api/auth/health` | ❌ | Health check |

---

## 🔐 Security Notes

### Development
- Default JWT secret is insecure (fine for dev)
- Database password is public (fine for dev)
- CORS is wide open (`*`)

### Production
1. **Change JWT_SECRET** to a strong random value
2. **Change DB_PASSWORD** to a secure password
3. **Disable DB_SYNC** (set to `false`)
4. **Configure CORS_ORIGIN** to your frontend domain
5. **Enable HTTPS** (use reverse proxy like Nginx)
6. **Set NODE_ENV=production**

---

## 📚 Next Steps

- [ ] Add Swagger API documentation
- [ ] Implement MFA (TOTP)
- [ ] Add email verification
- [ ] Add password reset flow
- [ ] Implement OIDC discovery endpoints
- [ ] Add JWKS key rotation
- [ ] Add rate limiting middleware
- [ ] Set up monitoring (Prometheus/Grafana)

---

## 💡 Development Tips

```bash
# Watch mode (auto-restart on changes)
npm run start:dev

# Debug mode
npm run start:debug

# Build for production
npm run build

# Run production build
npm run start:prod

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm test
```

---

**Built by**: Harshan Aiyappa  
**Stack**: NestJS • TypeScript • PostgreSQL • Redis • JWT • OIDC  
**License**: MIT
