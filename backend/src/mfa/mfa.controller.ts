import { Controller, Post, Body, UseGuards, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { MfaService } from './mfa.service';
import { VerifyMfaDto, MfaLoginDto } from './dto/mfa.dto';

@ApiTags('Multi-Factor Authentication')
@Controller('mfa')
export class MfaController {
    constructor(
        private readonly mfaService: MfaService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('setup')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate MFA secret and QR code' })
    @ApiResponse({ status: 200, description: 'MFA setup initiated' })
    async setupMfa(@GetUser() user: User) {
        const { secret, qrCode, otpauthUrl } = await this.mfaService.generateSecret(
            user.id,
            user.username,
        );

        return {
            message: 'Scan QR code with your authenticator app',
            secret,
            qrCode,
            otpauthUrl,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('verify')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify TOTP token and activate MFA' })
    @ApiResponse({ status: 200, description: 'MFA activated' })
    @ApiResponse({ status: 400, description: 'Invalid token' })
    async verifyMfa(@GetUser() user: User, @Body() verifyDto: VerifyMfaDto) {
        const secret = await this.mfaService.getSecret(user.id) ||
            (await this.mfaService.generateSecret(user.id, user.username)).secret;

        const isValid = await this.mfaService.verifyAndActivate(
            user.id,
            verifyDto.token,
            secret,
        );

        if (!isValid) {
            return { success: false, message: 'Invalid token' };
        }

        // Update user entity
        user.mfaEnabled = true;
        await this.userRepository.save(user);

        return {
            success: true,
            message: 'MFA successfully enabled',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('disable')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disable MFA for current user' })
    @ApiResponse({ status: 200, description: 'MFA disabled' })
    async disableMfa(@GetUser() user: User) {
        await this.mfaService.disableMfa(user.id);

        user.mfaEnabled = false;
        await this.userRepository.save(user);

        return {
            message: 'MFA disabled successfully',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('status')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check MFA status' })
    @ApiResponse({ status: 200, description: 'MFA status retrieved' })
    async getMfaStatus(@GetUser() user: User) {
        const isEnabled = await this.mfaService.isMfaEnabled(user.id);

        return {
            mfaEnabled: isEnabled,
        };
    }
}
