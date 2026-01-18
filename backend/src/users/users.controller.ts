import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved' })
    async getProfile(@GetUser() user: User) {
        // Fetch fresh from DB to get roles etc
        const freshUser = await this.usersService.findById(user.id);
        return this.sanitizeUser(freshUser);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated' })
    async updateProfile(@GetUser() user: User, @Body() dto: UpdateUserDto) {
        const updatedUser = await this.usersService.update(user.id, dto);
        return this.sanitizeUser(updatedUser);
    }

    @Post('me/password')
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid current password' })
    async changePassword(@GetUser() user: User, @Body() dto: ChangePasswordDto) {
        await this.usersService.changePassword(user.id, dto);
        return { message: 'Password changed successfully' };
    }

    private sanitizeUser(user: User) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
            roles: user.roles?.map(r => r.name) || [],
            createdAt: user.createdAt,
        };
    }
}
