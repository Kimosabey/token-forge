import { Module } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { JwksService } from './jwks.service';

@Module({
    controllers: [OidcController],
    providers: [OidcService, JwksService],
    exports: [JwksService],
})
export class OidcModule { }
