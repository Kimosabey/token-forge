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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register a new user account' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 409, description: 'Username or email already exists' })
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

    @Public()
    @Post('login')
    @ApiOperation({ summary: 'Login with username/email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
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

    @Public()
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout current session' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } })
    @HttpCode(HttpStatus.OK)
    async logout(@GetUser() user: User, @Body() body: { refreshToken: string }, @Req() req: Request) {
        const accessToken = req.headers.authorization?.split(' ')[1];

        await this.authService.logout(user.id, body.refreshToken, accessToken);

        return {
            message: 'Logout successful',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke all active sessions for user' })
    @ApiResponse({ status: 200, description: 'All sessions revoked' })
    @HttpCode(HttpStatus.OK)
    async logoutAll(@GetUser() user: User) {
        await this.authService.logoutAll(user.id);

        return {
            message: 'Logged out from all devices',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
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

    @Public()
    @Get('health')
    @ApiOperation({ summary: 'Service health check' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
