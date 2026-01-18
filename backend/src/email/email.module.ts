import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { RedisModule } from '../redis/redis.module';
import { User } from '../entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User]), RedisModule],
    providers: [EmailService],
    controllers: [EmailController],
    exports: [EmailService],
})
export class EmailModule { }
