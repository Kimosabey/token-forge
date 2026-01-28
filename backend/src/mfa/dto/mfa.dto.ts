import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
    @ApiProperty({
        description: '6-digit TOTP token from authenticator app',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    token: string;
}

export class MfaLoginDto {
    @ApiProperty({
        description: '6-digit TOTP token for MFA verification',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    mfaToken: string;
}
