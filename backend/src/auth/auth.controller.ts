import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    UseGuards,
    Get,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Register a new user
     * POST /auth/register
     */
    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        const tokens = await this.authService.register(registerDto, ipAddress, userAgent);

        return {
            message: 'User registered successfully',
            ...tokens,
        };
    }

    /**
     * Login user
     * POST /auth/login
     */
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        const tokens = await this.authService.login(loginDto, ipAddress, userAgent);

        return {
            message: 'Login successful',
            ...tokens,
        };
    }

    /**
     * Refresh access token
     * POST /auth/refresh
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        const tokens = await this.authService.refreshTokens(
            refreshTokenDto.refreshToken,
            ipAddress,
            userAgent,
        );

        return {
            message: 'Token refreshed successfully',
            ...tokens,
        };
    }

    /**
     * Logout user (revoke current session)
     * POST /auth/logout
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@GetUser() user: User, @Body() body: { refreshToken: string }, @Req() req: Request) {
        const accessToken = req.headers.authorization?.split(' ')[1];

        await this.authService.logout(user.id, body.refreshToken, accessToken);

        return {
            message: 'Logout successful',
        };
    }

    /**
     * Logout from all devices
     * POST /auth/logout-all
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(@GetUser() user: User) {
        await this.authService.logoutAll(user.id);

        return {
            message: 'Logged out from all devices',
        };
    }

    /**
     * Get current user profile
     * GET /auth/me
     */
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@GetUser() user: User) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
            roles: user.roles?.map(role => role.name) || [],
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        };
    }

    /**
     * Health check for auth service
     * GET /auth/health
     */
    @Public()
    @Get('health')
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
