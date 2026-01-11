import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, Session, Role, AuditLog, AuditAction } from '../../entities';
import { RegisterDto, LoginDto } from '../dto';
import { TokenService, TokenPair } from './token.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
        private tokenService: TokenService,
        private redisService: RedisService,
        private configService: ConfigService,
    ) { }

    /**
     * Register a new user
     */
    async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: [
                { email: registerDto.email },
                { username: registerDto.username },
            ],
        });

        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        // Hash password
        const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
        const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

        // Get default user role
        let userRole = await this.roleRepository.findOne({ where: { name: 'user' } });

        // Create default role if it doesn't exist
        if (!userRole) {
            userRole = this.roleRepository.create({
                name: 'user',
                description: 'Default user role',
                permissions: ['read:profile', 'update:profile'],
            });
            await this.roleRepository.save(userRole);
        }

        // Create user
        const user = this.userRepository.create({
            email: registerDto.email,
            username: registerDto.username,
            password: hashedPassword,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            roles: [userRole],
        });

        const savedUser = await this.userRepository.save(user);

        // Log registration
        await this.createAuditLog({
            userId: savedUser.id,
            action: AuditAction.REGISTER,
            ipAddress,
            userAgent,
            success: true,
        });

        // Generate tokens
        const tokens = this.tokenService.generateTokenPair(savedUser);

        // Create session
        await this.createSession(savedUser.id, tokens.refreshToken, ipAddress, userAgent);

        return tokens;
    }

    /**
     * Login user with username/email and password
     */
    async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
        // Find user by username or email
        const user = await this.userRepository.findOne({
            where: [
                { username: loginDto.usernameOrEmail },
                { email: loginDto.usernameOrEmail },
            ],
            relations: ['roles'],
        });

        if (!user) {
            await this.createAuditLog({
                action: AuditAction.FAILED_LOGIN,
                ipAddress,
                userAgent,
                success: false,
                metadata: { reason: 'User not found', identifier: loginDto.usernameOrEmail },
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if account is locked
        if (user.isLocked()) {
            await this.createAuditLog({
                userId: user.id,
                action: AuditAction.FAILED_LOGIN,
                ipAddress,
                userAgent,
                success: false,
                metadata: { reason: 'Account locked' },
            });
            throw new UnauthorizedException(`Account is locked until ${user.lockedUntil}`);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            // Increment failed login attempts
            user.failedLoginAttempts += 1;

            // Lock account after 5 failed attempts
            if (user.failedLoginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                await this.createAuditLog({
                    userId: user.id,
                    action: AuditAction.ACCOUNT_LOCKED,
                    ipAddress,
                    userAgent,
                    success: true,
                });
            }

            await this.userRepository.save(user);

            await this.createAuditLog({
                userId: user.id,
                action: AuditAction.FAILED_LOGIN,
                ipAddress,
                userAgent,
                success: false,
                metadata: { reason: 'Invalid password', attempts: user.failedLoginAttempts },
            });

            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        // Reset failed login attempts
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        user.lastLoginIp = ipAddress || null;

        await this.userRepository.save(user);

        // Log successful login
        await this.createAuditLog({
            userId: user.id,
            action: AuditAction.LOGIN,
            ipAddress,
            userAgent,
            success: true,
        });

        // Generate tokens
        const tokens = this.tokenService.generateTokenPair(user);

        // Create session
        await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

        return tokens;
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
        // Verify refresh token
        let decoded;
        try {
            decoded = await this.tokenService.verifyRefreshToken(refreshToken);
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Find session
        const session = await this.sessionRepository.findOne({
            where: { refreshToken, isActive: true },
            relations: ['user', 'user.roles'],
        });

        if (!session || !session.isValid()) {
            throw new UnauthorizedException('Invalid or expired session');
        }

        // Revoke old session
        session.isActive = false;
        session.revokedAt = new Date();
        session.revokedReason = 'Token refreshed';
        await this.sessionRepository.save(session);

        // Log token refresh
        await this.createAuditLog({
            userId: session.user.id,
            action: AuditAction.TOKEN_REFRESH,
            ipAddress,
            userAgent,
            success: true,
        });

        // Generate new tokens
        const newTokens = this.tokenService.generateTokenPair(session.user);

        // Create new session
        await this.createSession(session.user.id, newTokens.refreshToken, ipAddress, userAgent);

        return newTokens;
    }

    /**
     * Logout user (revoke session and blacklist tokens)
     */
    async logout(userId: string, refreshToken: string, accessToken?: string): Promise<void> {
        // Revoke session
        const session = await this.sessionRepository.findOne({
            where: { refreshToken, userId, isActive: true },
        });

        if (session) {
            session.isActive = false;
            session.revokedAt = new Date();
            session.revokedReason = 'User logout';
            await this.sessionRepository.save(session);
        }

        // Blacklist access token if provided
        if (accessToken) {
            const expiresIn = this.tokenService.getAccessTokenExpiration();
            await this.redisService.blacklistToken(accessToken, expiresIn);
        }

        // Log logout
        await this.createAuditLog({
            userId,
            action: AuditAction.LOGOUT,
            success: true,
        });
    }

    /**
     * Logout from all devices (revoke all sessions)
     */
    async logoutAll(userId: string): Promise<void> {
        await this.sessionRepository.update(
            { userId, isActive: true },
            { isActive: false, revokedAt: new Date(), revokedReason: 'Logout from all devices' },
        );

        // Delete all sessions from Redis
        await this.redisService.deleteUserSessions(userId);
    }

    /**
     * Validate user by ID
     */
    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['roles'],
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return user;
    }

    /**
     * Create session record
     */
    private async createSession(
        userId: string,
        refreshToken: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<Session> {
        const expiresAt = new Date(
            Date.now() + this.tokenService.getRefreshTokenExpiration() * 1000,
        );

        const session = this.sessionRepository.create({
            userId,
            refreshToken,
            expiresAt,
            ipAddress,
            userAgent,
            isActive: true,
        });

        return this.sessionRepository.save(session);
    }

    /**
     * Create audit log
     */
    private async createAuditLog(data: {
        userId?: string;
        action: AuditAction;
        ipAddress?: string;
        userAgent?: string;
        success: boolean;
        metadata?: Record<string, any>;
        errorMessage?: string;
    }): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create(data);
        return this.auditLogRepository.save(auditLog);
    }
}
