import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Use 'require' to avoid TypeScript import compatibility issues with this specific library
const Strategy = require('passport-42').Strategy;
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('OAUTH_42_CLIENT_ID'),
      clientSecret: configService.get<string>('OAUTH_42_CLIENT_SECRET'),
      callbackURL: configService.get<string>('OAUTH_42_CALLBACK_URL'),
      scope: ['public'],
      // Explicitly add these URLs to satisfy TypeScript/Passport requirements
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any, // Use 'any' because the library doesn't export the Profile interface cleanly
  ): Promise<any> {
    const { id, username, emails, photos } = profile;
    
    const user = {
      oauthId: id,
      oauthProvider: '42',
      email: emails?.[0]?.value || `${username}@student.42.fr`,
      nick: username,
      avatarUrl: photos?.[0]?.value,
    };

    return user;
  }
}