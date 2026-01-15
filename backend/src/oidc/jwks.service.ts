import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface KeyPair {
    kid: string; // Key ID
    publicKey: string;
    privateKey: string;
    createdAt: Date;
    expiresAt: Date;
    algorithm: string;
}

@Injectable()
export class JwksService implements OnModuleInit {
    private readonly logger = new Logger(JwksService.name);
    private keyPairs: KeyPair[] = [];
    private readonly keyStoragePath: string;
    private readonly keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
    private readonly gracePeriod = 24 * 60 * 60 * 1000; // 24 hours

    constructor(private readonly configService: ConfigService) {
        this.keyStoragePath = path.join(process.cwd(), 'keys');
    }

    async onModuleInit() {
        // Ensure keys directory exists
        if (!fs.existsSync(this.keyStoragePath)) {
            fs.mkdirSync(this.keyStoragePath, { recursive: true });
        }

        // Load existing keys or generate new ones
        await this.loadOrGenerateKeys();

        // Schedule automatic rotation
        this.scheduleKeyRotation();

        this.logger.log('JWKS Service initialized with key rotation enabled');
    }

    private async loadOrGenerateKeys() {
        const keyFiles = fs.readdirSync(this.keyStoragePath).filter(f => f.endsWith('.json'));

        if (keyFiles.length > 0) {
            // Load existing keys
            for (const file of keyFiles) {
                const keyData = JSON.parse(fs.readFileSync(path.join(this.keyStoragePath, file), 'utf-8'));
                this.keyPairs.push({
                    ...keyData,
                    createdAt: new Date(keyData.createdAt),
                    expiresAt: new Date(keyData.expiresAt),
                });
            }
            this.logger.log(`Loaded ${keyFiles.length} existing key pairs`);
        } else {
            // Generate initial key pair
            await this.generateNewKeyPair();
        }

        // Clean up expired keys
        this.cleanupExpiredKeys();
    }

    async generateNewKeyPair(): Promise<KeyPair> {
        const kid = crypto.randomUUID();
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        const keyPair: KeyPair = {
            kid,
            publicKey,
            privateKey,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.keyRotationInterval + this.gracePeriod),
            algorithm: 'RS256',
        };

        this.keyPairs.push(keyPair);

        // Persist to disk
        fs.writeFileSync(
            path.join(this.keyStoragePath, `${kid}.json`),
            JSON.stringify(keyPair, null, 2),
        );

        this.logger.log(`Generated new RSA key pair: ${kid}`);
        return keyPair;
    }

    getPublicKeySet() {
        const keys = this.keyPairs
            .filter(kp => new Date() < kp.expiresAt)
            .map(kp => {
                const publicKeyObj = crypto.createPublicKey(kp.publicKey);
                const jwk = publicKeyObj.export({ format: 'jwk' });

                return {
                    kid: kp.kid,
                    kty: 'RSA',
                    alg: kp.algorithm,
                    use: 'sig',
                    n: jwk.n,
                    e: jwk.e,
                };
            });

        return { keys };
    }

    getCurrentPrivateKey(): string {
        const activeKeys = this.keyPairs.filter(kp => new Date() < kp.expiresAt);
        if (activeKeys.length === 0) {
            throw new Error('No active keys available');
        }
        // Return the newest key
        return activeKeys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].privateKey;
    }

    getCurrentKid(): string {
        const activeKeys = this.keyPairs.filter(kp => new Date() < kp.expiresAt);
        if (activeKeys.length === 0) {
            throw new Error('No active keys available');
        }
        // Return the newest key ID
        return activeKeys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].kid;
    }

    private scheduleKeyRotation() {
        setInterval(async () => {
            this.logger.log('Checking if key rotation is needed...');

            const newestKey = this.keyPairs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            const keyAge = Date.now() - newestKey.createdAt.getTime();

            if (keyAge >= this.keyRotationInterval) {
                this.logger.warn('Key rotation threshold reached. Generating new key pair...');
                await this.generateNewKeyPair();
                this.cleanupExpiredKeys();
            }
        }, 24 * 60 * 60 * 1000); // Check daily
    }

    private cleanupExpiredKeys() {
        const now = new Date();
        const expiredKeys = this.keyPairs.filter(kp => kp.expiresAt < now);

        for (const key of expiredKeys) {
            const filePath = path.join(this.keyStoragePath, `${key.kid}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`Deleted expired key: ${key.kid}`);
            }
        }

        // Remove from memory
        this.keyPairs = this.keyPairs.filter(kp => kp.expiresAt >= now);
    }

    async rotateKeys(): Promise<void> {
        this.logger.warn('Manual key rotation triggered');
        await this.generateNewKeyPair();
        this.cleanupExpiredKeys();
    }
}
