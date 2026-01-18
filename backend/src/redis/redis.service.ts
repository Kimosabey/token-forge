import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;

    constructor(private configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis connection error:', err);
        });
    }

    onModuleDestroy() {
        this.client.disconnect();
    }

    // ========== Token Blacklist ==========
    async blacklistToken(token: string, expiresIn: number): Promise<void> {
        const key = `blacklist:${token}`;
        await this.client.setex(key, expiresIn, '1');
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const key = `blacklist:${token}`;
        const result = await this.client.get(key);
        return result === '1';
    }

    // ========== Session Management ==========
    async saveSession(sessionId: string, data: any, expiresIn: number): Promise<void> {
        const key = `session:${sessionId}`;
        await this.client.setex(key, expiresIn, JSON.stringify(data));
    }

    async getSession(sessionId: string): Promise<any | null> {
        const key = `session:${sessionId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async deleteSession(sessionId: string): Promise<void> {
        const key = `session:${sessionId}`;
        await this.client.del(key);
    }

    async deleteUserSessions(userId: string): Promise<void> {
        const pattern = `session:*`;
        const keys = await this.client.keys(pattern);

        for (const key of keys) {
            const data = await this.client.get(key);
            if (data) {
                const session = JSON.parse(data);
                if (session.userId === userId) {
                    await this.client.del(key);
                }
            }
        }
    }

    // ========== Rate Limiting ==========
    async incrementRateLimit(key: string, ttl: number): Promise<number> {
        const rateLimitKey = `ratelimit:${key}`;
        const current = await this.client.incr(rateLimitKey);

        if (current === 1) {
            await this.client.expire(rateLimitKey, ttl);
        }

        return current;
    }

    async getRateLimitCount(key: string): Promise<number> {
        const rateLimitKey = `ratelimit:${key}`;
        const count = await this.client.get(rateLimitKey);
        return count ? parseInt(count, 10) : 0;
    }

    async resetRateLimit(key: string): Promise<void> {
        const rateLimitKey = `ratelimit:${key}`;
        await this.client.del(rateLimitKey);
    }

    // ========== Generic Cache ==========
    async set(key: string, value: any, ttl?: number): Promise<void> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttl) {
            await this.client.setex(key, ttl, stringValue);
        } else {
            await this.client.set(key, stringValue);
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const value = await this.client.get(key);

        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    // ========== Health Check ==========
    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
