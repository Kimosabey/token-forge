import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User, Role, Session, AuditLog } from '../entities';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, Session, AuditLog]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
                },
            }),
        }),
        RedisModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, TokenService, JwtStrategy, LocalStrategy],
    exports: [AuthService, TokenService, JwtStrategy, PassportModule],
})
export class AuthModule { }
