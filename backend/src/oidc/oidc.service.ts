import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksService } from './jwks.service';

@Injectable()
export class OidcService {
    private readonly issuer: string;
    private readonly baseUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly jwksService: JwksService,
    ) {
        this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
        this.issuer = `${this.baseUrl}/api`;
    }

    getOpenIdConfiguration() {
        return {
            issuer: this.issuer,
            authorization_endpoint: `${this.baseUrl}/api/auth/authorize`,
            token_endpoint: `${this.baseUrl}/api/auth/token`,
            userinfo_endpoint: `${this.baseUrl}/api/auth/me`,
            jwks_uri: `${this.baseUrl}/api/.well-known/jwks.json`,
            registration_endpoint: `${this.baseUrl}/api/auth/register`,
            scopes_supported: ['openid', 'profile', 'email'],
            response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token'],
            grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
            claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'email', 'email_verified', 'name', 'given_name', 'family_name'],
            code_challenge_methods_supported: ['S256'],
        };
    }

    getJwks() {
        return this.jwksService.getPublicKeySet();
    }
}
