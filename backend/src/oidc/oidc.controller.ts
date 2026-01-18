import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OidcService } from './oidc.service';

@ApiTags('OIDC Discovery')
@Controller('.well-known')
export class OidcController {
    constructor(private readonly oidcService: OidcService) { }

    @Public()
    @Get('openid-configuration')
    @ApiOperation({ summary: 'Get OpenID Connect Discovery metadata' })
    @ApiResponse({ status: 200, description: 'OIDC configuration metadata' })
    getOpenIdConfiguration() {
        return this.oidcService.getOpenIdConfiguration();
    }

    @Public()
    @Get('jwks.json')
    @ApiOperation({ summary: 'Get JSON Web Key Set (JWKS)' })
    @ApiResponse({ status: 200, description: 'Public keys for JWT verification' })
    getJwks() {
        return this.oidcService.getJwks();
    }
}
