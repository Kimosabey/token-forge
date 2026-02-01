# 🎓 Interview Q&A: TokenForge

## 1. The Elevator Pitch (2 Minutes)

"TokenForge is an Enterprise-Grade **Distributed Identity System** built on NestJS.

It solves the 'State vs Stateless' dilemma in authentication:
1.  **Stateless Access**: Uses RS256-signed JWTs for API authorization (No DB lookup, infinite horizontal scaling).
2.  **Stateful Control**: Uses Redis-backed Refresh Tokens for session management (Instant Revocation, Rotation).
3.  **Security Rigor**: Implements automated JWKS Key Rotation and OIDC Discovery endpoints, unlike typical tutorial-grade auth apps."

---

## 2. "Explain Like I'm 5" (The Wristband)

"Imagine a Music Festival.
*   **The Ticket (Refresh Token)**: You keep this in your safe at the hotel. It's valuable.
*   **The Wristband (Access Token)**: The hotel gives you a wristband valid for 1 hour.
*   **The Guard (API)**: Checks your wristband. He doesn't call the hotel; he just checks if the text on it is valid. (Stateless).
*   **Expiry**: If your wristband expires, you go back to the hotel with your Ticket to get a new one.
*   **Banned**: If you cause trouble, the hotel burns your Ticket. Your current wristband works for 5 more minutes, but you can never get a new one."

---

## 3. Tough Technical Questions

### Q: Why Use Redis for Refresh Tokens? Why not SQL?
**A:** "Performance and TTL.
*   **Rotation**: Every time a user refreshes their session (e.g., every 15 mins), we do a Write operation (Delete Old, Save New). Redis handles these high-write workloads effortlessly compared to SQL INSERT/DELETEs.
*   **TTL**: Redis automatically deletes expired tokens. In SQL, I'd need a cron job to `DELETE FROM tokens WHERE expired < NOW()`, which clogs the DB."

### Q: How do you secure the JWTs?
**A:** "I use **RS256 (Asymmetric Encryption)**.
*   **Private Key**: Stored ONLY in the Auth Service. Used to sign tokens.
*   **Public Key**: Exposed via `/.well-known/jwks.json`. Other Microservices download this to verify tokens.
*   **Benefit**: If an attacker hacks a Microservice, they only find the Public Key. They cannot forge new Admin tokens because they lack the Private Key."

### Q: What happens if the Redis Cache dies?
**A:** "The system enters a 'Fail-Secure' state.
*   **Existing Access Tokens**: Still work (Stateless). Users currently browsing are unaffected.
*   **New Logins/Refreshes**: Fail. We deliberately block them because we cannot track the session or enforce rate limits. Availability is sacrificed for Security consistency."
