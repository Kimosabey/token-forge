import { Controller, Get, Post, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { EmailService } from './email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDto, ForgotPasswordDto } from './dto/email.dto';

@ApiTags('Email Verification')
@Controller('email')
export class EmailController {
    constructor(
        private readonly emailService: EmailService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    @Public()
    @Get('verify')
    @ApiOperation({ summary: 'Verify email address via token' })
    @ApiResponse({ status: 200, description: 'Email verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmail(@Query('token') token: string) {
        const userId = await this.emailService.verifyEmailToken(token);

        if (!userId) {
            throw new HttpException('Invalid or expired verification token', HttpStatus.BAD_REQUEST);
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        user.emailVerified = true;
        await this.userRepository.save(user);

        return {
            message: 'Email verified successfully',
        };
    }

    @Public()
    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const user = await this.userRepository.findOne({
            where: { email: forgotPasswordDto.email },
        });

        // Always return success to prevent email enumeration
        if (user) {
            await this.emailService.sendPasswordResetEmail(user.email, user.username);
        }

        return {
            message: 'If an account with that email exists, a password reset link has been sent',
        };
    }

    @Public()
    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        const email = await this.emailService.verifyResetToken(resetPasswordDto.token);

        if (!email) {
            throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
        }

        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);
        user.password = hashedPassword;
        await this.userRepository.save(user);

        // Delete the reset token
        await this.emailService.deleteResetToken(resetPasswordDto.token);

        return {
            message: 'Password reset successfully',
        };
    }
}
