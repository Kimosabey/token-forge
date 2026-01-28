import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MfaService {
    constructor(private readonly redisService: RedisService) { }

    /**
     * Generate a new TOTP secret for a user
     */
    async generateSecret(userId: string, username: string): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
        const secret = speakeasy.generateSecret({
            name: `TokenForge (${username})`,
            issuer: 'TokenForge',
            length: 32,
        });

        // Generate QR code for scanning
        const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

        // Store secret temporarily (15 minutes) until verified
        await this.redisService.set(
            `mfa:pending:${userId}`,
            secret.base32,
            900, // 15 minutes
        );

        return {
            secret: secret.base32,
            qrCode,
            otpauthUrl: secret.otpauth_url || '',
        };
    }

    /**
     * Verify TOTP token and activate MFA for user
     */
    async verifyAndActivate(userId: string, token: string, secret: string): Promise<boolean> {
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2, // Allow 2 time steps before and after
        });

        if (isValid) {
            // Remove pending secret
            await this.redisService.del(`mfa:pending:${userId}`);

            // Store active MFA secret
            await this.redisService.set(`mfa:active:${userId}`, secret);
        }

        return isValid;
    }

    /**
     * Verify TOTP token for login
     */
    async verifyToken(userId: string, token: string): Promise<boolean> {
        const secret = await this.redisService.get<string>(`mfa:active:${userId}`);
        if (!secret) {
            return false;
        }

        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2,
        });
    }

    /**
     * Disable MFA for a user
     */
    async disableMfa(userId: string): Promise<void> {
        await this.redisService.del(`mfa:active:${userId}`);
        await this.redisService.del(`mfa:pending:${userId}`);
    }

    /**
     * Check if user has MFA enabled
     */
    async isMfaEnabled(userId: string): Promise<boolean> {
        const secret = await this.redisService.get<string>(`mfa:active:${userId}`);
        return !!secret;
    }

    /**
     * Get MFA secret for user (internal use)
     */
    async getSecret(userId: string): Promise<string | null> {
        return this.redisService.get<string>(`mfa:active:${userId}`);
    }
}
