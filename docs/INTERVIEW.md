# 💼 TokenForge Interview Guide

> **Ace Your Senior Backend Engineering Interview**

## 🎯 How to Use This Guide

This document prepares you to discuss TokenForge in technical interviews for **Senior Backend Engineer**, **Platform Engineer**, or **Security Engineer** roles.

---

## 📐 System Design Questions

### Q1: "Design an authentication system for 10 million users"

**Your Answer** (Using TokenForge):

```
"I would implement a distributed OAuth 2.0/OIDC system with the following architecture:

1. **Stateless Access Tokens (JWT)**
   - Short-lived (15 minutes) to limit exposure
   - RS256 signatures for distributed validation
   - No database lookup needed → horizontal scaling

2. **Stateful Refresh Tokens (Redis)**
   - Long-lived (7 days) stored in Redis cluster
   - Enables instant revocation
   - Token rotation on every use

3. **Data Layer**
   - PostgreSQL for user profiles (ACID guarantees)
   - Redis for sessions (sub-ms latency)
   - Separate read replicas for queries

4. **Scalability**: 
   - Auth service: Stateless → easy horizontal scaling
   - Redis: Master-slave replication + sharding
   - PostgreSQL: Read replicas for user lookups

5. **Security**:
   - Rate limiting (Redis-backed distributed)
   - JWKS key rotation (automated)
   - MFA support (TOTP)
   - Comprehensive audit logging

At 10M users:
- ~100k concurrent sessions
- ~1000 req/sec to auth endpoints
- Redis: 16GB RAM for session storage
- PostgreSQL: Sharded by user_id hash
```

**Follow-up**: "How would you handle a sudden 10x spike?"
- **Answer**: "Auto-scaling groups, CDN for JWKS endpoint, circuit breakers to protect database"

---

### Q2: "How do you prevent brute-force attacks on login?"

**Your Answer**:

```typescript
"Multi-layered defense:

1. **Network Layer**: Cloudflare rate limiting (before reaching app)

2. **Application Layer**: Redis-backed distributed rate limiting
   - Per IP: 5 attempts/minute
   - Per user: 10 attempts/hour
   - Progressive delays (exponential backoff)

3. **Account Layer**: After 5 failed attempts:
   - Require CAPTCHA
   - After 10 attempts: Temporary account lock (15 minutes)
   - After 20 attempts: Email notification + manual unlock

4. **Detection**: Monitor for distributed attacks
   - Alert on >100 failed attempts from different IPs for same user
   - Auto-block IP ranges showing coordinated behavior

5. **Recovery**: Password reset link with time-limited token
```

**Code Example**:
```typescript
@Throttle(5, 60) // 5 req/min
@Post('login')
async login(@Body() credentials) {
  const attempts = await this.redis.get(`fail:${credentials.email}`);
  
  if (attempts > 5) {
    if (!credentials.captcha) {
      throw new ForbiddenException('CAPTCHA_REQUIRED');
    }
  }
  
  try {
    return await this.authenticate(credentials);
  } catch (error) {
    await this.redis.incr(`fail:${credentials.email}`);
    await this.redis.expire(`fail:${credentials.email}`, 3600);
    throw error;
  }
}
```

---

### Q3: "JWT vs Session Cookies: When to use each?"

**Your Answer**:

| Aspect             | JWT                          | Session Cookie              |
|--------------------|------------------------------|-----------------------------|
| **Storage**        | Client-side (memory/cookie)  | Server-side (Redis/DB)      |
| **Scalability**    | ✅ Stateless (no DB lookup)  | ⚠️ Stateful (requires Redis)|
| **Revocation**     | ❌ Difficult (short expiry)  | ✅ Instant (delete session) |
| **Size**           | ⚠️ Large (~1-2KB)            | ✅ Small (32 chars)         |
| **Security**       | ⚠️ XSS risk if in localStorage | ✅ HttpOnly cookie         |
| **Use Case**       | Microservices, APIs          | Monoliths, high-security    |

**TokenForge Approach**: Hybrid
- **Access Token (JWT)**: Stateless, short-lived (15 min), for API authorization
- **Refresh Token**: Stateful (Redis), long-lived (7 days), for renewal

**Why?**: Best of both worlds
- Performance: No DB lookup on every request (JWT validation)
- Security: Instant revocation via refresh token blacklist
- User Experience: Long sessions without frequent re-login

---

## 🔐 Security Deep Dive

### Q4: "How do you securely store passwords?"

**Your Answer**:

```typescript
"Never store plaintext passwords. Use adaptive hashing:

1. **Algorithm**: bcrypt (not MD5/SHA1)
   - Adaptive: Can increase rounds as hardware improves
   - Built-in salt: Prevents rainbow tables
   - Slow by design: Prevents brute-force (0.3s per attempt)

2. **Implementation**:
```typescript
// Hashing (registration)
const saltRounds = 12; // 2^12 iterations (~300ms)
const hash = await bcrypt.hash(password, saltRounds);
await this.userRepo.save({ email, passwordHash: hash });

// Verification (login)
const user = await this.userRepo.findByEmail(email);
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Why not SHA256?**:  
- SHA256 is fast (~1 million/sec) → easy to brute-force  
- bcrypt is slow (~3/sec) → 333,000x harder to crack

**Alternative**: Argon2id (even better, winner of Password Hashing Competition)
```

---

### Q5: "Explain JWT signature verification"

**Your Answer**:

```
"JWT has 3 parts: `header.payload.signature`

Example JWT:
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.     ← Header (base64)
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6...   ← Payload (base64)
TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFON... ← Signature (RSA)

Verification Process:

1. **Decode Header**: Extract algorithm (RS256)
2. **Fetch Public Key**: From JWKS endpoint by `kid` (key ID)
3. **Recompute Signature**:
   signature = RSA_SHA256(header.payload, publicKey)
4. **Compare**: Does recomputed signature match JWT signature?
5. **Validate Claims**:
   - `exp` (expiration): Is token expired?
   - `iat` (issued at): Is token issued in future (clock skew)?
   - `iss` (issuer): Is this from trusted issuer?

Why RSA (not HMAC-SHA256)?:
- HMAC: Symmetric (same key signs & verifies)
  → Every service needs the secret → security risk
- RSA: Asymmetric (private key signs, public key verifies)
  → Only auth service has private key → more secure
```

**Code**:
```typescript
const publicKey = await this.getPublicKey(header.kid);
const isValid = crypto.verify(
  'RSA-SHA256',
  Buffer.from(`${header}.${payload}`),
  publicKey,
  signature
);
```

---

## 🏗️ Architecture Questions

### Q6: "How would you add OAuth 2.0 Social Login (Google, GitHub)?"

**Your Answer**:

```typescript
"Implement PassportJS strategies:

1. **Google Strategy**:
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private userService: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://api.tokenforge.com/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken, refreshToken, profile) {
    // Find or create user
    let user = await this.userService.findByEmail(profile.emails[0].value);
    
    if (!user) {
      user = await this.userService.create({
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        authProvider: 'GOOGLE',
        googleId: profile.id,
      });
    }
    
    return user;
  }
}

2. **Endpoints**:
@Get('auth/google')
@UseGuards(AuthGuard('google'))
googleLogin() {} // Redirects to Google

@Get('auth/google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req) {
  // User authenticated, issue our own JWT
  return this.authService.login(req.user);
}
```

**Flow**:
1. User clicks "Login with Google"
2. Redirect to Google OAuth consent screen
3. User approves → Google redirects to callback with `code`
4. Exchange `code` for Google access token
5. Fetch user profile from Google API
6. Create/update user in our database
7. Issue our own JWT tokens
```

---

### Q7: "How do you handle API rate limiting in a distributed system?"

**Your Answer**:

```typescript
"Use Redis as centralized rate limit store:

@Injectable()
export class DistributedRateLimiter {
  async checkLimit(
    key: string,      // 'login:192.168.1.1'
    max: number,      // 5
    window: number    // 60 seconds
  ): Promise<boolean> {
    const current = await this.redis
      .multi()
      .incr(key)
      .expire(key, window)
      .exec();
    
    return current[0][1] <= max;
  }
}

Usage:
@Post('login')
async login(@Ip() ip) {
  const allowed = await this.rateLimiter.checkLimit(
    `login:${ip}`,
    5,   // 5 requests
    60   // per minute
  );
  
  if (!allowed) {
    throw new TooManyRequestsException('Rate limit exceeded');
  }
  
  // Proceed
}

Why Redis?:
- Atomic operations (INCR + EXPIRE)
- Low latency (~1ms)
- Centralized state (all app instances see same count)
- Auto-expiry (TTL)

Alternative: Token Bucket Algorithm (more sophisticated)
- Allows bursts
- Smoother rate limiting
```

---

## 💡 Behavioral Questions

### Q8: "Describe a challenging bug you fixed"

**Your Answer** (TokenForge Example):

```
"I encountered a race condition in token refresh logic:

Problem:
- User had 2 browser tabs open
- Both tabs refreshed access token simultaneously
- Tab 1 rotated refresh token RT1 → RT2
- Tab 2 tried to use RT1 → failed (already rotated)
- Tab 2 user logged out unexpectedly

Root Cause:
- No synchronization between concurrent refresh requests
- No idempotency (same input → different output)

Solution:
1. **Distributed Lock** (Redis):
   - Acquire lock on refresh token before processing
   - Other requests wait or fail fast

2. **Idempotency**:
   - Cache rotated tokens for 30 seconds
   - If RT1 already rotated, return cached RT2

Code:
const lock = await this.redisLock.acquire(`lock:${rt}`, 5000);
const cached = await this.redis.get(`rotated:${rt}`);
if (cached) return JSON.parse(cached);

const newTokens = await this.rotate(rt);
await this.redis.setex(`rotated:${rt}`, 30, JSON.stringify(newTokens));

Outcome:
- Race condition eliminated
- User experience improved (no unexpected logouts)
- Learned: Always consider concurrent scenarios
```

---

## 🧮 Performance Questions

### Q9: "How do you optimize database queries?"

**Your Answer** (TokenForge Example):

```sql
"Common bottleneck: Login query

-- SLOW (325ms):
SELECT * FROM users WHERE email = 'user@example.com';

Problem:
- No index on email column
- Full table scan (10M rows)

Fix:
-- Add index:
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- New query time: 8ms (40x faster)

Other Optimizations:
1. **Limit columns**: SELECT id, passwordHash (not SELECT *)
2. **Connection pooling**: Reuse DB connections
3. **Prepared statements**: Compile query once
4. **Query caching**: Cache frequently accessed users (Redis)
5. **Read replicas**: Separate read/write workloads

Monitoring:
- pg_stat_statements: Find slow queries
- EXPLAIN ANALYZE: Understand query plan
- Connection pool metrics: Detect saturation
```

---

### Q10: "How do you measure and improve API latency?"

**Your Answer**:

```typescript
"Measure:
@Injectable()
export class PerformanceInterceptor {
  intercept(context, next) {
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - start;
        this.prometheus.histogram('http_request_duration_ms', latency);
      })
    );
  }
}

Optimize:
1. **Database**: 
   - Indexing (email, userId)
   - Connection pooling
   - Query optimization

2. **Caching** (Redis):
   - User profile cache (1 hour TTL)
   - JWKS public key cache
   - Rate limit counters

3. **Async Operations**:
   - Audit logging (fire-and-forget)
   - Email sending (background queue)

4. **CDN**:
   - Cache OIDC discovery endpoints
   - Serve JWKS from edge

Results:
- P50: 45ms → 20ms
- P99: 320ms → 85ms
- P99.9: 1.2s → 180ms
```

---

## 🎓 Coding Challenges

### Challenge 1: "Implement JWT refresh with rotation"

```typescript
async refreshTokens(oldRefreshToken: string) {
  // 1. Validate signature
  const payload = this.jwtService.verify(oldRefreshToken);
  
  // 2. Check expiry
  if (payload.exp < Date.now() / 1000) {
    throw new UnauthorizedException('Refresh token expired');
  }
  
  // 3. Check blacklist (reuse detection)
  const isBlacklisted = await this.redis.exists(`bl:${oldRefreshToken}`);
  if (isBlacklisted) {
    // Potential token theft! Revoke all user sessions
    await this.revokeAllUserTokens(payload.sub);
    throw new UnauthorizedException('Token reused - security violation');
  }
  
  // 4. Generate new tokens
  const newAccessToken = this.jwtService.sign({
    sub: payload.sub,
    email: payload.email,
  }, { expiresIn: '15m' });
  
  const newRefreshToken = this.jwtService.sign({
    sub: payload.sub,
    type: 'refresh',
  }, { expiresIn: '7d' });
  
  // 5. Blacklist old refresh token
  await this.redis.setex(
    `bl:${oldRefreshToken}`,
    604800, // 7 days (match RT expiry)
    'rotated'
  );
  
  // 6. Store new refresh token
  await this.redis.setex(
    `rt:${payload.sub}:${newRefreshToken}`,
    604800,
    JSON.stringify({ userId: payload.sub, createdAt: Date.now() })
  );
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
```

---

## 🏆 Interview Pro Tips

1. **Draw Diagrams**: Always sketch architecture on whiteboard
2. **Think Aloud**: Explain your reasoning process
3. **Ask Clarifying Questions**: "What's the expected traffic?" "What's the budget?"
4. **Discuss Trade-offs**: Nothing is perfect, show you understand pros/cons
5. **Scale**: Start simple, then evolve ("At 1K users... At 1M users...")
6. **Reference Real Systems**: "Similar to how OAuth 2.0 works..." "Like AWS Cognito..."
7. **Security First**: Always mention security considerations
8. **Metrics**: Quantify everything ("Reduced latency by 60%")

---

## 📚 Study Checklist

- [ ] Understand OAuth 2.0 flows (Authorization Code, Client Credentials)
- [ ] Know JWT structure (header.payload.signature)
- [ ] Grasp RS256 vs HS256 difference
- [ ] Explain OIDC on top of OAuth 2.0
- [ ] Describe CAP theorem (Consistency, Availability, Partition Tolerance)
- [ ] Redis data structures (String, Hash, Set, Sorted Set)
- [ ] PostgreSQL indexes (B-tree, Hash, GiST)
- [ ] Rate limiting algorithms (Token Bucket, Leaky Bucket)
- [ ] Circuit Breaker pattern
- [ ] CORS and CSRF attacks

---

**Good Luck!** 🍀 | Practice with [LeetCode](https://leetcode.com) | [System Design Primer](https://github.com/donnemartin/system-design-primer)
