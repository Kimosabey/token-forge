import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
    throttlers: [
        {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute for general endpoints
        },
        {
            name: 'auth',
            ttl: 60000, // 1 minute
            limit: 5, // 5 login attempts per minute
        },
        {
            name: 'strict',
            ttl: 60000, // 1 minute
            limit: 3, // 3 sensitive operations per minute
        },
    ],
};
