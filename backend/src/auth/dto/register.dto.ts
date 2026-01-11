import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(3)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Username can only contain letters, numbers, underscores and hyphens',
    })
    username: string;

    @IsString()
    @MinLength(8)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message: 'Password must contain uppercase, lowercase, number and special character',
        },
    )
    password: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
}
