import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
    sub: string; // user id
    username: string;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class TokenService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    /**
     * Generate access token (short-lived, stateless JWT)
     */
    generateAccessToken(user: User): string {
        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            email: user.email,
            roles: user.roles?.map(role => role.name) || [],
        };

        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        });
    }

    /**
     * Generate refresh token (long-lived, stored in DB/Redis)
     */
    generateRefreshToken(user: User): string {
        const payload = {
            sub: user.id,
            type: 'refresh',
        };

        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        });
    }

    /**
     * Generate both access and refresh tokens
     */
    generateTokenPair(user: User): TokenPair {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Parse expiration time (e.g., "15m" -> 900 seconds)
        const expiresIn = this.parseExpirationToSeconds(
            this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        );

        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }

    /**
     * Verify and decode access token
     */
    async verifyAccessToken(token: string): Promise<JwtPayload> {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.get('JWT_SECRET'),
        });
    }

    /**
     * Verify and decode refresh token
     */
    async verifyRefreshToken(token: string): Promise<any> {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.get('JWT_SECRET'),
        });
    }

    /**
     * Decode token without verification (for getting user info from expired tokens)
     */
    decodeToken(token: string): JwtPayload | null {
        try {
            return this.jwtService.decode(token) as JwtPayload;
        } catch {
            return null;
        }
    }

    /**
     * Get token expiration time in seconds
     */
    getAccessTokenExpiration(): number {
        return this.parseExpirationToSeconds(
            this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        );
    }

    getRefreshTokenExpiration(): number {
        return this.parseExpirationToSeconds(
            this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        );
    }

    /**
     * Parse expiration string to seconds
     * Supports: 15m, 7d, 3600s, 1h
     */
    private parseExpirationToSeconds(expiration: string): number {
        const match = expiration.match(/^(\d+)([smhd])$/);

        if (!match) {
            throw new Error(`Invalid expiration format: ${expiration}`);
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 60 * 60 * 24;
            default:
                throw new Error(`Unknown time unit: ${unit}`);
        }
    }

    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader) return null;

        const [type, token] = authHeader.split(' ');

        return type === 'Bearer' ? token : null;
    }
}
