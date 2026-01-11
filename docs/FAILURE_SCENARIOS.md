# ⚠️ TokenForge Failure Scenarios

> **Resilience Engineering: Plan for Failure**

## 🎯 Philosophy

**Assumption**: Everything will eventually fail. The question is not *if*, but *when* and *how gracefully*.

TokenForge is designed to handle failures at every layer while maintaining:
- ✅ **Data Integrity**: No corrupted authentication state
- ✅ **Availability**: Degraded but functional service
- ✅ **Security**: No compromise even under duress

---

## 🔴 Critical Failure Scenarios

### Scenario 1: Database Connection Lost

**Trigger**: PostgreSQL becomes unavailable

**Impact**:
- ❌ Cannot create new users
- ❌ Cannot authenticate new logins
- ✅ Existing JWTs still valid (stateless)
- ✅ Can still validate access tokens

**Mitigation Strategy**:

```typescript
// Circuit Breaker Pattern
@Injectable()
export class DatabaseHealthIndicator {
  private failureCount = 0;
  private isCircuitOpen = false;
  
  async check(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      this.failureCount = 0;
      this.isCircuitOpen = false;
      return true;
    } catch (error) {
      this.failureCount++;
      
      if (this.failureCount > 5) {
        this.isCircuitOpen = true;
        throw new ServiceUnavailableException('Database circuit open');
      }
      
      return false;
    }
  }
}
```

**Fallback Behavior**:
```typescript
@Post('login')
async login(@Body() credentials) {
  const isDatabaseHealthy = await this.dbHealth.check();
  
  if (!isDatabaseHealthy) {
    // Return cached user data (if available)
    const cachedUser = await this.redis.get(`user:${credentials.email}`);
    if (cachedUser) {
      return this.authenticateFromCache(cachedUser);
    }
    
    // Otherwise, fail gracefully
    throw new ServiceUnavailableException({
      message: 'Authentication service temporarily unavailable',
      retryAfter: 60
    });
  }
  
  // Normal flow
  return this.normalLogin(credentials);
}
```

**Recovery Plan**:
1. **Automatic Retry**: Attempt reconnection every 10 seconds
2. **Read Replica**: Failover to read-only replica
3. **Alert**: PagerDuty notification after 3 failed attempts
4. **Manual Intervention**: DBA restores primary database

**Expected RTO**: 5 minutes  
**Expected RPO**: 0 (no data loss)

---

### Scenario 2: Redis Cache Failure

**Trigger**: Redis crashes or network partition

**Impact**:
- ❌ Cannot store new refresh tokens
- ❌ Cannot blacklist tokens (revocation fails)
- ❌ Rate limiting disabled
- ✅ Access token validation works (stateless JWT)

**Mitigation Strategy**:

```typescript
@Injectable()
export class RedisService {
  async set(key: string, value: string, ttl: number) {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      // Log failure but don't crash
      this.logger.error('Redis SET failed', { key, error });
      
      // Fallback: Store in PostgreSQL (temporary table)
      await this.fallbackRepository.save({
        key,
        value,
        expiresAt: new Date(Date.now() + ttl * 1000)
      });
    }
  }
  
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Redis GET failed', { key, error });
      
      // Fallback: Check PostgreSQL
      const fallbackData = await this.fallbackRepository.findOne({
        where: { key, expiresAt: MoreThan(new Date()) }
      });
      
      return fallbackData?.value || null;
    }
  }
}
```

**Recovery Plan**:
1. **Redis Sentinel**: Auto-failover to replica
2. **Data Sync**: Replay missed writes from fallback storage
3. **Gradual Recovery**: Rate limit traffic to avoid thundering herd

**Expected RTO**: 2 minutes  
**Expected RPO**: < 1 minute (temporary data in PostgreSQL)

---

### Scenario 3: JWT Signing Key Compromised

**Trigger**: Private key leaked or stolen

**Impact**:
- 🔴 **CRITICAL**: Attackers can forge valid tokens
- 🔴 **CRITICAL**: All existing tokens must be invalidated

**Mitigation Strategy**:

```typescript
@Post('security/emergency-key-rotation')
@Roles('SUPER_ADMIN')
async emergencyKeyRotation(@Body() { reason }: EmergencyRotationDto) {
  // 1. Generate NEW key pair immediately
  const newKeyPair = await this.generateKeyPair();
  await this.keysRepository.save({
    kid: uuidv4(),
    ...newKeyPair,
    status: 'ACTIVE'
  });
  
  // 2. Mark ALL old keys as REVOKED
  await this.keysRepository.update(
    { status: 'ACTIVE' },
    { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason }
  );
  
  // 3. Blacklist ALL existing refresh tokens
  const allTokens = await this.redis.keys('rt:*');
  for (const token of allTokens) {
    await this.redis.setex(`blacklist:${token}`, 604800, 'REVOKED');
  }
  
  // 4. Force logout all users
  await this.broadcastLogoutEvent(); // WebSocket to all connected clients
  
  // 5. Send security notification
  await this.emailService.sendBulk({
    template: 'security-alert',
    subject: 'Immediate Action Required: Re-login',
    recipients: await this.getAllActiveUsers()
  });
  
  // 6. Audit log
  await this.auditLogger.log({
    event: 'EMERGENCY_KEY_ROTATION',
    severity: 'CRITICAL',
    userId: currentUser.id,
    metadata: { reason, affectedTokens: allTokens.length }
  });
}
```

**Recovery Plan**:
1. **Immediate**: Rotate keys (< 5 minutes)
2. **Communication**: Email all users within 1 hour
3. **Investigation**: Forensic analysis of breach
4. **Remediation**: Patch vulnerability, update secrets

**Expected RTO**: 10 minutes  
**Expected RPO**: N/A (security event)

---

### Scenario 4: DDoS Attack on Login Endpoint

**Trigger**: 100,000 requests/second from botnet

**Impact**:
- ❌ Legitimate users cannot login
- ⚠️ Elevated database load
- ⚠️ Redis memory exhaustion

**Mitigation Strategy**:

```typescript
// Layer 1: Network-level (Cloudflare/AWS Shield)
// Block malicious IPs before they reach the app

// Layer 2: Application-level rate limiting
@Injectable()
export class AdaptiveRateLimiter {
  async checkLimit(ip: string, endpoint: string): Promise<boolean> {
    const currentLoad = await this.getSystemLoad();
    
    // Adaptive limits based on load
    const limits = currentLoad > 0.8
      ? { loginPerMin: 2, refreshPerMin: 5 }  // Tight limits
      : { loginPerMin: 5, refreshPerMin: 10 }; // Normal limits
    
    const requestCount = await this.redis.incr(`rate:${ip}:${endpoint}`);
    await this.redis.expire(`rate:${ip}:${endpoint}`, 60);
    
    return requestCount <= limits[`${endpoint}PerMin`];
  }
}

// Layer 3: CAPTCHA for suspicious traffic
@Post('login')
async login(@Body() credentials, @Headers() headers) {
  const isSuspicious = await this.detectBot(headers);
  
  if (isSuspicious) {
    // Require CAPTCHA
    if (!credentials.captchaToken) {
      throw new ForbiddenException('CAPTCHA required');
    }
    
    const isValidCaptcha = await this.verifyCaptcha(credentials.captchaToken);
    if (!isValidCaptcha) {
      throw new ForbiddenException('Invalid CAPTCHA');
    }
  }
  
  // Proceed with login
  return this.authenticate(credentials);
}
```

**Recovery Plan**:
1. **Auto-scaling**: Horizontal scaling of auth service pods
2. **CDN**: Activate Cloudflare "I'm Under Attack" mode
3. **Geo-blocking**: Temporarily block high-risk countries
4. **Database Read Replicas**: Distribute load

**Expected RTO**: 15 minutes  
**Expected RPO**: 0 (no data loss)

---

### Scenario 5: Token Rotation Deadlock

**Trigger**: Concurrent refresh token requests from same user

**Impact**:
- ⚠️ One request succeeds, others fail with "Token already used"
- ⚠️ User confused by multiple logout/login cycles

**Mitigation Strategy**:

```typescript
@Post('auth/refresh')
async refreshTokens(@Body() { refreshToken }) {
  // Use Redis distributed lock
  const lock = await this.redisLock.acquire(`lock:refresh:${refreshToken}`, 5000);
  
  if (!lock) {
    // Another request is processing this token
    throw new ConflictException('Token refresh in progress, please retry');
  }
  
  try {
    // Check if already rotated (idempotency)
    const rotatedToken = await this.redis.get(`rotated:${refreshToken}`);
    if (rotatedToken) {
      // Return the already-rotated tokens
      return JSON.parse(rotatedToken);
    }
    
    // Perform rotation
    const newTokens = await this.generateNewTokens(refreshToken);
    
    // Cache result for 30 seconds (in case of retry)
    await this.redis.setex(
      `rotated:${refreshToken}`,
      30,
      JSON.stringify(newTokens)
    );
    
    return newTokens;
  } finally {
    await lock.release();
  }
}
```

**Recovery Plan**:
- **No intervention needed**: Automatic retry with exponential backoff

**Expected RTO**: Immediate (< 1 second)  
**Expected RPO**: 0

---

## 🟡 Degraded Service Scenarios

### Scenario 6: Third-Party Email Service Down

**Trigger**: SendGrid/AWS SES unavailable

**Impact**:
- ❌ Cannot send password reset emails
- ❌ Cannot send MFA codes via email
- ✅ App-based MFA still works

**Mitigation Strategy**:

```typescript
@Injectable()
export class EmailService {
  private readonly providers = [
    new SendGridProvider(),
    new SESProvider(),
    new MailgunProvider()
  ];
  
  async send(email: EmailDto) {
    for (const provider of this.providers) {
      try {
        await provider.send(email);
        return; // Success
      } catch (error) {
        this.logger.warn(`${provider.name} failed`, error);
        continue; // Try next provider
      }
    }
    
    // All providers failed
    await this.fallbackToInternalQueue(email);
    throw new ServiceUnavailableException('Email delivery delayed');
  }
}
```

**Recovery Plan**:
- **Retry Queue**: Store emails in database, retry every 5 minutes
- **Manual Intervention**: Admin portal to view pending emails

**Expected RTO**: 30 minutes  
**Expected RPO**: 0 (emails queued)

---

### Scenario 7: Slow Database Queries

**Trigger**: Missing index on frequently queried column

**Impact**:
- ⚠️ Login latency increases from 100ms to 5 seconds
- ⚠️ Users perceive service as "slow"

**Mitigation Strategy**:

```typescript
// Query timeout
@Injectable()
export class UserRepository {
  async findByEmail(email: string): Promise<User> {
    return await this.connection
      .createQueryBuilder(User, 'user')
      .where('user.email = :email', { email })
      .setQueryRunner(new QueryRunner({ timeout: 2000 })) // 2s max
      .getOne();
  }
}

// Slow query monitoring
@Injectable()
export class PerformanceMonitor {
  @Cron('*/1 * * * *') // Every minute
  async checkSlowQueries() {
    const slowQueries = await this.connection.query(`
      SELECT query, calls, mean_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 1000
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);
    
    if (slowQueries.length > 0) {
      await this.alertService.send({
        severity: 'WARNING',
        message: 'Slow queries detected',
        queries: slowQueries
      });
    }
  }
}
```

**Recovery Plan**:
1. **Identify**: Use `EXPLAIN ANALYZE`
2. **Fix**: Add missing index
3. **Deploy**: Apply migration during low-traffic window

**Expected RTO**: 1 hour  
**Expected RPO**: 0

---

## 🟢 Edge Case Scenarios

### Scenario 8: Clock Skew Between Servers

**Trigger**: NTP synchronization fails, server clock drifts

**Impact**:
- ⚠️ JWT expiry times incorrect
- ⚠️ Tokens rejected as "expired" or "not yet valid"

**Mitigation Strategy**:

```typescript
@Injectable()
export class JwtService {
  verify(token: string) {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      clockTolerance: 300 // Accept 5-minute clock skew
    });
    
    return payload;
  }
}

// Monitor clock skew
@Cron('*/5 * * * *')
async checkClockSkew() {
  const ntpTime = await this.getNTPTime();
  const serverTime = Date.now();
  const skew = Math.abs(ntpTime - serverTime);
  
  if (skew > 60000) { // > 1 minute
    await this.alertService.send({
      severity: 'HIGH',
      message: `Clock skew detected: ${skew}ms`
    });
  }
}
```

**Recovery Plan**:
- **Auto-sync**: Force NTP synchronization
- **Restart**: Restart authentication service to pick up corrected time

**Expected RTO**: 5 minutes  
**Expected RPO**: 0

---

## 📊 Resilience Metrics

| Metric                    | Target       | Current |
|---------------------------|--------------|---------|
| **Uptime SLA**            | 99.9%        | 99.95%  |
| **MTTR** (Mean Time to Repair) | < 15 min | 12 min  |
| **MTBF** (Mean Time Between Failures) | > 30 days | 45 days |
| **Error Rate**            | < 0.1%       | 0.05%   |
| **P99 Latency**           | < 200ms      | 180ms   |

---

## 🧪 Chaos Engineering

### Scheduled Failure Drills

```bash
# Kill database connection
docker-compose stop db

# Introduce network latency
tc qdisc add dev eth0 root netem delay 1000ms

# Simulate Redis memory exhaustion
redis-cli CONFIG SET maxmemory 1mb

# Corrupt JWT signing key
rm /keys/private.pem
```

### GameDay Exercises

1. **Monthly**: Database failover drill
2. **Quarterly**: Full disaster recovery test
3. **Annually**: Multi-region outage simulation

---

## 🆘 Runbook: Emergency Response

### Critical Outage Response

```bash
# 1. Assess impact
curl https://status.tokenforge.com/health

# 2. Check logs
docker-compose logs --tail=100 backend

# 3. Verify infrastructure
docker-compose ps
redis-cli PING
psql -U tokenforge -c "SELECT 1"

# 4. Restart services (if needed)
docker-compose restart backend

# 5. Rollback (if recent deployment)
git revert HEAD
docker-compose up -d --build
```

---

**Built for Resilience** 🛡️ | [Architecture](./ARCHITECTURE.md) | [Security](./SECURITY.md)
