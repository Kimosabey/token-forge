import { IsString, IsNotEmpty, MinLength, Matches, NotEquals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must be too weak (requires upper, lower, number/special)',
    })
    @NotEquals('currentPassword')
    newPassword: string;
}
