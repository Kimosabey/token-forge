import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    firstName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    lastName?: string;
}
