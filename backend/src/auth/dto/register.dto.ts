import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'john@example.com', description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'johndoe', description: 'Unique username' })
    @IsString()
    @MinLength(3)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Username can only contain letters, numbers, underscores and hyphens',
    })
    username: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'Strong password' })
    @IsString()
    @MinLength(8)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message: 'Password must contain uppercase, lowercase, number and special character',
        },
    )
    password: string;

    @ApiPropertyOptional({ example: 'John' })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    lastName?: string;
}
