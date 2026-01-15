import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { RedisModule } from '../redis/redis.module';
import { User } from '../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        RedisModule,
    ],
    providers: [MfaService],
    controllers: [MfaController],
    exports: [MfaService],
})
export class MfaModule { }
