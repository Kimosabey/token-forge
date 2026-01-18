import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { OidcModule } from './oidc/oidc.module';
import { MfaModule } from './mfa/mfa.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { getDatabaseConfig } from './config/database.config';
import { throttlerConfig } from './throttle/throttle.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot(throttlerConfig),

    // Redis
    RedisModule,

    // Feature Modules
    AuthModule,
    OidcModule,
    MfaModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
