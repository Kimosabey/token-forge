# TokenForge

![Thumbnail](docs/assets/thumbnail.png)

## Enterprise Distributed Identity System with OIDC & OAuth2

<div align="center">

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Standard](https://img.shields.io/badge/Standard-OIDC_OAuth2-orange?style=for-the-badge&logo=openid&logoColor=white)

</div>

**TokenForge** is a professional Authentication Platform built with **NestJS**. It implements the **OIDC (OpenID Connect)** standard, featuring a hybrid "Stateless Access / Stateful Refresh" architecture. It balances extreme horizontal scalability with surgical security controls like **Instant Revocation** and **Automated Key Rotation**.

---

## 🚀 Quick Start

Launch the Identity Infrastructure and Auth Service in one command:

```bash
# 1. Start DB & Redis
docker-compose up -d

# 2. Start Auth Service
cd backend && npm install && npm run start:dev
```

> **Detailed Setup**: See [GETTING_STARTED.md](./docs/GETTING_STARTED.md).

---

## 📸 Architecture & Patterns

### Security Intelligence Dashboard
![Dashboard](docs/assets/dashboard.png)
*Visualizing active sessions, token rotation logs, and system security levels.*

### System Architecture
![Architecture](docs/assets/architecture.png)
*Distributed Identity Provider implementing the OIDC standard.*

### Secure Identity Flow
![Workflow](docs/assets/workflow.png)
*OIDC Handshake -> JWT Generation -> Stateful Refresh in Redis.*

> **Deep Dive**: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the PKI logic.

---

## ✨ Key Features

*   **🛡️ OIDC Compliant**: Provides `/.well-known/openid-configuration` and **JWKS** endpoints.
*   **🔑 Asymmetric RS256**: High-security signing where only the Auth Service holds the Private Key.
*   **🔄 Token Family Rotation**: Detects and stops token theft by invalidating entire lease families.
*   **⚡ Redis-Backed Sessions**: Sub-millisecond session revocation and L7 rate limiting.

---

## 🏗️ The Protective Journey

How a user identity is forged and protected:

1.  **Request**: User submits credentials or OIDC redirect.
2.  **Verify**: Service validates against PostgreSQL via Bcrypt (Rounds=12).
3.  **Forge**: RS256 Private Key signs a stateless **Access JWT** (15m).
4.  **Lease**: A stateful **Refresh Token** is generated and pinned in Redis (7d).
5.  **Rotate**: On every refresh, the old token is burned and a new pair is issued (Rotation).
6.  **Verify**: Microservices download the **Public Key** via JWKS to verify tokens locally.

---

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| [**System Architecture**](./docs/ARCHITECTURE.md) | RS256 PKI design, dual-token patterns, and schema. |
| [**Getting Started**](./docs/GETTING_STARTED.md) | Docker environment, OIDC config, and Test scripts. |
| [**Failure Scenarios**](./docs/FAILURE_SCENARIOS.md) | Circuit breakers, emergency revocation, and fail-secure. |
| [**Interview Q&A**](./docs/INTERVIEW_QA.md) | "JWT vs Session", "RS256 vs HS256", and the Wristband Analogy. |

---

## 🔧 Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Auth Engine** | **NestJS 10** | Modular Identity Framework. |
| **Durable Store**| **PostgreSQL 16** | User Profiles & RBAC. |
| **Fast Store** | **Redis 7** | Refresh Tokens & Rate Limits. |
| **Cryto Logic** | **Passport.js** | Security Strategy Abstraction. |

---

## 👤 Author

**Harshan Aiyappa**  
Senior Full-Stack Hybrid AI Engineer  
Voice AI • Distributed Systems • Infrastructure

[![Portfolio](https://img.shields.io/badge/Portfolio-kimo--nexus.vercel.app-00C7B7?style=flat&logo=vercel)](https://kimo-nexus.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Kimosabey-black?style=flat&logo=github)](https://github.com/Kimosabey)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Harshan_Aiyappa-blue?style=flat&logo=linkedin)](https://linkedin.com/in/harshan-aiyappa)
[![X](https://img.shields.io/badge/X-@HarshanAiyappa-black?style=flat&logo=x)](https://x.com/HarshanAiyappa)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
