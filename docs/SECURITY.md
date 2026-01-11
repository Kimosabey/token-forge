# 🔒 TokenForge Security Guide

> **Enterprise-Grade Security for Identity Systems**

![Security Layers](./assets/security-layers.png)

## 🎯 Security Philosophy

TokenForge implements **Defense-in-Depth** security architecture. Every layer provides independent protection, ensuring that a breach in one layer doesn't compromise the entire system.

---

## 🛡️ Security Layers

### Layer 1: Rate Limiting 🚦

**Purpose**: Prevent brute-force attacks and DDoS

**Implementation**:
```typescript
// Rate limiting per IP
@Throttle(5, 60) // 5 requests per minute
@Post('login')
async login(@Body() credentials) {
  // ...
}
```

**Configuration**:
- **Login Endpoint**: 5 attempts/minute per IP
- **Registration**: 3 attempts/hour per IP
- **Token Refresh**: 10 attempts/minute per user
- **Password Reset**: 2 attempts/hour per email

**Storage**: Redis-backed distributed rate limiting

**Response on Limit**:
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 45
}
```

---

### Layer 2: Input Validation 🔍

**Purpose**: Prevent injection attacks (SQL, NoSQL, XSS)

**Validation Rules**:

#### Email Validation
```typescript
@IsEmail()
@MaxLength(255)
email: string;
```

#### Password Policy
```typescript
@IsStrongPassword({
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
})
password: string;
```

**Sanitization**:
- Strip HTML tags from all inputs
- Escape special characters
- Validate against regex patterns
- Type coercion prevention

---

### Layer 3: Authentication 🔐

**Purpose**: Verify user identity

#### Password Hashing

**Algorithm**: bcrypt with salt rounds = 12

```typescript
import * as bcrypt from 'bcrypt';

async hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}
```

**Why bcrypt?**
- Adaptive (can increase rounds as hardware improves)
- Built-in salt generation
- Resistant to rainbow table attacks
- Slow by design (prevents brute-force)

#### Multi-Factor Authentication (MFA)

**Supported Methods**:
1. ✅ **TOTP** (Time-based One-Time Password)
   - App: Google Authenticator, Authy
   - Algorithm: HMAC-SHA1
   - Interval: 30 seconds

2. ✅ **Email OTP**
   - Fallback method
   - 6-digit code
   - Expiry: 10 minutes

**Implementation**:
```typescript
@Post('mfa/verify')
async verifyMFA(
  @Body() { userId, code }: VerifyMFADto
) {
  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });
  
  if (!isValid) {
    throw new UnauthorizedException('Invalid MFA code');
  }
}
```

---

### Layer 4: Authorization 🚪

**Purpose**: Control access to resources

#### Role-Based Access Control (RBAC)

**Role Hierarchy**:
```
SUPER_ADMIN
    ├── ADMIN
    │   ├── MANAGER
    │   │   ├── USER
    │   │   └── GUEST
```

**Permission Model**:
```typescript
{
  resource: 'users',
  actions: ['create', 'read', 'update', 'delete'],
  conditions: {
    ownerId: '${user.id}' // Can only modify own data
  }
}
```

**Guard Example**:
```typescript
@UseGuards(RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Get('users')
async getAllUsers() {
  // Only admins and managers can access
}
```

---

### Layer 5: Encryption 🔐

**Purpose**: Protect data at rest and in transit

#### Data in Transit

**TLS Configuration**:
```typescript
const httpsOptions = {
  key: fs.readFileSync('./certs/server.key'),
  cert: fs.readFileSync('./certs/server.crt'),
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256'
  ].join(':')
};

await app.listen(3000, httpsOptions);
```

#### Data at Rest

**PostgreSQL Encryption**:
```sql
-- Enable transparent data encryption
ALTER DATABASE tokenforge_db SET encrypt_columns = on;

-- Encrypt sensitive columns
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  ssn TEXT ENCRYPTED, -- PII encryption
  credit_card TEXT ENCRYPTED
);
```

**JWT Encryption**:
```typescript
// Signed JWT (default)
const accessToken = this.jwtService.sign(payload, {
  algorithm: 'RS256',
  expiresIn: '15m'
});

// Encrypted JWT (optional for sensitive data)
const encryptedToken = this.jwtService.sign(payload, {
  algorithm: 'RSA-OAEP-256',
  encryption: 'A256GCM'
});
```

---

## 🔑 Token Security

### Access Token Best Practices

✅ **DO**:
- Keep expiry short (15 minutes max)
- Store in memory only (not localStorage)
- Include minimal claims
- Use strong signature algorithm (RS256)

❌ **DON'T**:
- Store in local/sessionStorage (XSS risk)
- Include sensitive data (SSN, passwords)
- Use symmetric algorithms (HS256) in distributed systems
- Set expiry > 1 hour

### Refresh Token Security

![JWT Refresh Pattern](./assets/jwt-refresh.png)

**Rotation Strategy**:
```typescript
async refreshTokens(oldRefreshToken: string) {
  // 1. Validate old token
  const payload = await this.validateRefreshToken(oldRefreshToken);
  
  // 2. Check if blacklisted
  const isBlacklisted = await this.redis.get(`blacklist:${oldRefreshToken}`);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token revoked');
  }
  
  // 3. Generate NEW tokens
  const newAccessToken = this.generateAccessToken(payload);
  const newRefreshToken = this.generateRefreshToken(payload);
  
  // 4. Blacklist OLD refresh token
  await this.redis.setex(
    `blacklist:${oldRefreshToken}`,
    604800, // 7 days
    'true'
  );
  
  // 5. Return new tokens
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}
```

**Why Rotation?**
- Limits window of token theft
- Detects compromised tokens (reuse detection)
- Forces periodic re-authentication

---

## 🔐 JWKS Key Rotation

![Key Rotation](./assets/key-rotation.png)

### Automated Rotation Schedule

```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async rotateKeys() {
  // 1. Generate new RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  // 2. Create new key ID
  const kid = uuidv4();
  
  // 3. Store in database
  await this.keysRepository.save({
    kid,
    publicKey,
    privateKey,
    algorithm: 'RS256',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
  
  // 4. Mark old keys as deprecated (24h grace period)
  await this.keysRepository.update(
    { expiresAt: LessThan(new Date()) },
    { status: 'DEPRECATED' }
  );
}
```

**Grace Period**: 24 hours with both keys valid
**Rotation Frequency**: Every 30 days
**Key Length**: 2048-bit RSA

---

## ⚠️ Threat Model

### Attack Vectors & Mitigations

| Attack Vector          | Risk Level | Mitigation                                    |
|------------------------|------------|-----------------------------------------------|
| **Brute Force Login**  | 🔴 High    | Rate limiting + Account lockout               |
| **SQL Injection**      | 🔴 High    | Parameterized queries (TypeORM)               |
| **XSS**                | 🟡 Medium  | Content-Security-Policy + Input sanitization  |
| **CSRF**               | 🟡 Medium  | SameSite cookies + CSRF tokens                |
| **Token Theft**        | 🔴 High    | Short expiry + Token rotation                 |
| **Session Hijacking**  | 🟡 Medium  | HttpOnly cookies + Secure flag                |
| **Man-in-the-Middle**  | 🔴 High    | TLS 1.3 enforcement                           |
| **DDoS**               | 🟡 Medium  | Rate limiting + Cloudflare/AWS Shield         |

---

## 🔍 Security Auditing

### Audit Log Schema

```typescript
{
  id: UUID,
  userId: UUID,
  event: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'MFA_ENABLE',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  success: true,
  metadata: {
    location: 'US-CA',
    deviceType: 'Desktop'
  },
  timestamp: '2026-01-11T15:00:00Z'
}
```

### Monitoring Suspicious Activity

```typescript
@Cron('*/5 * * * *') // Every 5 minutes
async detectAnomalies() {
  // Detect multiple failed logins
  const suspiciousIPs = await this.auditRepository
    .createQueryBuilder('log')
    .select('log.ipAddress')
    .where('log.event = :event', { event: 'LOGIN' })
    .andWhere('log.success = false')
    .andWhere('log.timestamp > :since', { 
      since: new Date(Date.now() - 5 * 60 * 1000) 
    })
    .groupBy('log.ipAddress')
    .having('COUNT(*) > 10')
    .getRawMany();
    
  // Auto-block IPs
  for (const ip of suspiciousIPs) {
    await this.redis.setex(`blocked:${ip.ipAddress}`, 3600, 'true');
    await this.alertService.send({
      severity: 'HIGH',
      message: `Blocked IP ${ip.ipAddress} due to brute-force attempt`
    });
  }
}
```

---

## 🚨 Incident Response

### Security Breach Checklist

1. **Immediate Actions** (< 5 minutes)
   - [ ] Rotate all JWT signing keys immediately
   - [ ] Force logout all users (blacklist all refresh tokens)
   - [ ] Enable maintenance mode
   - [ ] Capture logs and traffic snapshot

2. **Assessment** (< 30 minutes)
   - [ ] Identify breach scope (affected users, data)
   - [ ] Check audit logs for unauthorized access
   - [ ] Review database query logs
   - [ ] Analyze Redis access patterns

3. **Containment** (< 2 hours)
   - [ ] Patch vulnerability
   - [ ] Update firewall rules
   - [ ] Reset affected user passwords
   - [ ] Notify security team

4. **Recovery** (< 4 hours)
   - [ ] Restore from clean backup (if needed)
   - [ ] Re-enable services gradually
   - [ ] Monitor for suspicious activity

5. **Post-Mortem** (< 1 week)
   - [ ] Document incident timeline
   - [ ] Update security policies
   - [ ] Conduct team training
   - [ ] Implement additional safeguards

---

## 🔬 Security Testing

### Penetration Testing Checklist

```bash
# SQL Injection
sqlmap -u "http://localhost:3000/auth/login" --data="email=test&password=test"

# XSS Testing
<script>alert('XSS')</script>

# CSRF Testing
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: refreshToken=stolen_token"

# Rate Limiting
for i in {1..100}; do
  curl -X POST http://localhost:3000/auth/login &
done

# JWT Algorithm Confusion
# Change "alg": "RS256" to "alg": "none"
```

### Automated Security Scans

```bash
# npm audit
npm audit --production

# OWASP Dependency Check
dependency-check --scan ./backend

# SonarQube
sonar-scanner -Dsonar.projectKey=tokenforge

# Snyk
snyk test
```

---

## 📋 Compliance

### GDPR Compliance

- ✅ **Right to Access**: `GET /users/me/data-export`
- ✅ **Right to Deletion**: `DELETE /users/me`
- ✅ **Data Portability**: JSON export format
- ✅ **Consent Management**: Explicit opt-in for cookies
- ✅ **Breach Notification**: 72-hour disclosure

### HIPAA Compliance (if handling health data)

- ✅ **Audit Controls**: Complete login/access logging
- ✅ **Encryption**: TLS + Database encryption
- ✅ **Access Control**: RBAC with least privilege
- ✅ **Automatic Logoff**: 15-minute session timeout

---

## 🎓 Security Best Practices

1. **🔑 Never log sensitive data** (passwords, tokens, PII)
2. **🔄 Rotate secrets regularly** (keys, passwords, API keys)
3. **📊 Monitor continuously** (failed logins, anomalies)
4. **🧪 Test security regularly** (penetration tests, audits)
5. **📖 Keep dependencies updated** (weekly `npm audit`)
6. **🔒 Principle of least privilege** (minimal permissions)
7. **🚫 Fail securely** (default deny, safe errors)
8. **📜 Document everything** (security incidents, changes)

---

## 🆘 Security Contact

Found a vulnerability? Please report responsibly:

📧 **Email**: security@tokenforge.com  
🔐 **PGP Key**: [Download](./security.asc)  
⏱️ **Response Time**: < 24 hours

**Please DO NOT** open public GitHub issues for security vulnerabilities.

---

**Built with 🔒 Security-First Mindset** | [Security Policy](./SECURITY_POLICY.md)
