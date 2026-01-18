import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'johndoe', description: 'Username or Email' })
    @IsString()
    @MinLength(3)
    usernameOrEmail: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @MinLength(8)
    password: string;
}
