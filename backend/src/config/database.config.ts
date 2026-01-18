import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USER', 'tokenforge'),
    password: configService.get<string>('DB_PASSWORD', 'secure_password_dev'),
    database: configService.get<string>('DB_NAME', 'tokenforge_db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get<boolean>('DB_SYNC', true), // ⚠️ True for Dev, False for Prod
    autoLoadEntities: true,
});
