# 🎉 TokenForge Setup - Almost Complete!

## ✅ What's Working

### **Infrastructure** ✅
- ✅ PostgreSQL 16 running on `localhost:5432`
- ✅ Redis 7 running on `localhost:6379`  
- ✅ pgAdmin running on `localhost:5050` (optional)
- ✅ Docker containers healthy

### **Code** ✅
- ✅ All 28 files created
- ✅ TypeScript compiles successfully (0 errors)
- ✅ Build completed: `npm run build` ✅

---

## 🔧 Final Steps to Run

### **Step 1: Verify `.env` File**

Make sure `backend/.env` has these exact values:

```bash
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

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**📝 Action**: Open `backend/.env` and verify these settings match.

---

### **Step 2: Connect DBeaver (Local)**

1. **Open DBeaver**
2. **Create New Connection** → PostgreSQL
3. **Enter these details**:
   ```
   Host:       localhost
   Port:       5432
   Database:   tokenforge_db
   Username:   tokenforge
   Password:   secure_password_dev
   ```
4. **Test Connection** - should work!
5. **Save** the connection

---

### **Step 3: Start Backend**

```bash
cd backend
npm run start:dev
```

**Expected output:**
```
🚀 TokenForge Auth Service running on: http://localhost:3000/api
📚 Health Check: http://localhost:3000/api/auth/health
✅ Redis connected successfully
✅ Database connected successfully
```

**If you see database connection errors:**
- The `.env` file might have incorrect values
- Check PostgreSQL is running: `docker ps | findstr tokenforge_db`

---

### **Step 4: Test the API**

#### **Health Check**
```powershell
curl http://localhost:3000/api/auth/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-11T..."
}
```

#### **Register a User**
```powershell
curl -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ...",
  "expiresIn": 900
}
```

#### **Login**
```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "usernameOrEmail": "testuser",
    "password": "SecurePass123!"
  }'
```

---

### **Step 5: Verify Database in DBeaver**

Once the backend starts, check DBeaver:

1. **Refresh** your connection
2. **Expand** `tokenforge_db` → Tables
3. **You should see**:
   - `users`
   - `roles`
   - `sessions`
   - `audit_logs`
   - `user_roles` (join table)

4. **Query the data**:
   ```sql
   SELECT id, username, email, "isActive" FROM users;
   SELECT * FROM roles;
   SELECT * FROM audit_logs;
   ```

---

## 🐛 Troubleshooting

### **Database Connection Failed**

**Check Docker is running:**
```powershell
docker ps
```

You should see `tokenforge_db` and `tokenforge_redis` running.

**Restart containers:**
```powershell
docker-compose restart
```

### **Redis Connection Failed**

**Check Redis:**
```powershell
docker exec tokenforge_redis redis-cli ping
```

Expected output: `PONG`

### **Port Already in Use (3000)**

**Find what's using it:**
```powershell
netstat -ano | findstr :3000
```

**Kill the process or change PORT in `.env`:**
```
PORT=3001
```

### **TypeScript Errors**

**Rebuild:**
```powershell
cd backend
npm run build
```

---

## 📊 Architecture Verification

### **Test All Endpoints**

```powershell
# 1. Health check
curl http://localhost:3000/api/auth/health

# 2. Register user
curl -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"john@test.com","username":"johndoe","password":"Test123!@#","firstName":"John"}'

# 3. Login (save the tokens)
$response = curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"usernameOrEmail":"johndoe","password":"Test123!@#"}' | ConvertFrom-Json

# 4. Get profile (use access token)
curl http://localhost:3000/api/auth/me `
  -H "Authorization: Bearer $($response.accessToken)"

# 5. Refresh token
curl -X POST http://localhost:3000/api/auth/refresh `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$($response.refreshToken)\"}"

# 6. Logout
curl -X POST http://localhost:3000/api/auth/logout `
  -H "Authorization: Bearer $($response.accessToken)" `
  -H "Content-Type: application/json" `
  -d "{\"refreshToken\":\"$($response.refreshToken)\"}"
```

---

## 🎯 What's Next

Once everything is running:

### **Phase 2 Features** (Future)
- [ ] OIDC Discovery (`/.well-known/openid-configuration`)
- [ ] JWKS Endpoint (`/.well-known/jwks.json`)
- [ ] RSA Key Rotation (automated)
- [ ] MFA/TOTP Implementation
- [ ] Email Verification
- [ ] Password Reset Flow
- [ ] Rate Limiting Middleware
- [ ] Swagger API Documentation
- [ ] OAuth2 Social Login (Google, GitHub)
- [ ] WebAuthn Support

---

## 📝 Quick Reference

### **Docker Commands**
```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart db
```

### **Database Access**
- **DBeaver**: `localhost:5432` (recommended ✅)
- **pgAdmin**: `http://localhost:5050` (admin@tokenforge.com / admin)
- **CLI**: `docker exec -it tokenforge_db psql -U tokenforge -d tokenforge_db`

### **API Base URL**
```
http://localhost:3000/api
```

---

## ✅ System Status Checklist

Before testing, verify:

- [ ] Docker containers running (`docker ps`)
- [ ] PostgreSQL accepting connections
- [ ] Redis responding to PING
- [ ] `.env` file configured correctly
- [ ] Backend compiled successfully (`npm run build`)
- [ ] Backend server started (`npm run start:dev`)
- [ ] DBeaver connected to database
- [ ] Tables created (users, roles, sessions, audit_logs)

---

**You're almost there!** 🚀

Just verify the `.env` file and start the backend with `npm run start:dev`.

**Need help?** Check the troubleshooting section above or review `docs/GETTING_STARTED.md`.

---

**Built by**: Harshan Aiyappa  
**Tech Stack**: NestJS • PostgreSQL • Redis • JWT • TypeORM  
**Status**: Phase 1 Complete ✅
