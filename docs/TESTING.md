# 🧪 TokenForge Testing Strategy

> **A comprehensive guide to verifying the security and reliability of the TokenForge authentication system.**

[![Status](https://img.shields.io/badge/Status-Operational-success?style=for-the-badge)](https://github.com/Kimosabey/token-forge)
[![Test Coverage](https://img.shields.io/badge/Coverage-100%25_Manual-blue?style=for-the-badge)](./scripts/test-full.ps1)
[![Swagger Docs](https://img.shields.io/badge/Docs-Swagger_UI-orange?style=for-the-badge)](http://localhost:3000/api/docs)

---

## 🛠 Automated Testing
We have provided a robust PowerShell script to automate the entire authentication lifecycle.

**Run the full suite:**
```powershell
.\scripts\test-full.ps1
```

**What it tests:**
1. ✅ **Health Check**: Service availability.
2. ✅ **Registration**: Creating new user accounts & password hashing.
3. ✅ **Profile Access**: Verifying JWT Guard protection.
4. ✅ **Login**: Credential validation & token generation.
5. ✅ **Refresh Token**: Session renewal via opaque refresh tokens.
6. ✅ **Logout**: Token blacklisting and session termination.

---

## 📝 Manual Testing Scenarios (QA)

Use **[Swagger UI](http://localhost:3000/api/docs)** or **Postman** to execute these test cases.

### 🔐 Auth Flow (Happy Path)
| Step | Action | Endpoint | Payload | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Register** | `POST /auth/register` | `{ email, username, password }` | **201 Created** + Access/Refresh Tokens |
| 2 | **Login** | `POST /auth/login` | `{ usernameOrEmail, password }` | **200 OK** + New Tokens |
| 3 | **Get Profile** | `GET /auth/me` | *Bearer Token Header* | **200 OK** + User Profile JSON |
| 4 | **Refresh** | `POST /auth/refresh` | `{ refreshToken }` | **200 OK** + New Tokens |
| 5 | **Logout** | `POST /auth/logout` | `{ refreshToken }` | **200 OK** + "Logout successful" |

### 🛡️ Security Edge Cases (Negative Testing)
These tests verify that the system correctly rejects invalid or malicious requests.

#### 1. Invalid Credentials
- **Action**: Login with wrong password.
- **Expected**: `401 Unauthorized`
- **Security Check**: Verify error message does not reveal *which* part (user vs password) failed.

#### 2. Account Locking (Brute Force Protection)
- **Action**: Attempt login 5 times with wrong password.
- **Expected (5th try)**: `401 Unauthorized` + "Account locked" message.
- **Recovery**: Wait 15 minutes or manually reset in DB.

#### 3. Duplicate Registration
- **Action**: Register with an existing email/username.
- **Expected**: `409 Conflict`

#### 4. Access Without Token
- **Action**: `GET /auth/me` without Authorization header.
- **Expected**: `401 Unauthorized`

#### 5. Blacklisted Token Usage
- **Action**: Use an Access Token *after* calling Logout.
- **Expected**: `401 Unauthorized` (Token is invalid)

#### 6. Expired Token
- **Action**: Use a token older than 15 minutes (default expiry).
- **Expected**: `401 Unauthorized` -> Client should trigger Refresh Flow.

---

## 🔍 Database Verification
You can inspect the `tokenforge_db` to verify data persistence.

**Connect via DBeaver:**
- **Host**: `localhost`
- **Port**: `5433` (Docker Mapped)
- **User**: `tokenforge`
- **Pass**: `secure_password_dev`
- **DB**: `tokenforge_db`

**Key Tables to Check:**
- `users`: Check `password_hash` (should be bcrypt), `is_active`, `locked_until`.
- `sessions`: Check `refresh_token_hash` and `expires_at`.
- `audit_logs`: Check for 'LOGIN_SUCCESS', 'REGISTER', 'LOGOUT' events.

---

## 🚀 Swagger Documentation
The API is fully documented using OpenAPI (Swagger).
- **URL**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Features**:
	- Interactive "Try it out" buttons.
	- Schema definitions for all DTOs.
	- Bearer Auth support (Click "Authorize" and paste your token).

---

> **Note**: For production environments, ensure `DB_SYNC` is set to `false` and proper migrations are used.
