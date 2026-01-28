import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Email address of the account',
        example: 'user@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Password reset token from email',
        example: 'abc123def456...',
    })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        description: 'New password (min 8 characters)',
        example: 'NewSecurePass123!',
    })
    @IsString()
    @MinLength(8)
    @IsNotEmpty()
    newPassword: string;
}
