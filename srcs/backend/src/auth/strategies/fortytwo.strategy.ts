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
    const { id, username, emails } = profile;
    //let lang = 'ca'; // Default
    //let country = 'FR'; // Default for Unkonwn
    
    const avatarUrl = profile._json?.image?.versions?.medium 
                   || profile._json?.image?.link 
                   || null;
    const languageIdentifier = profile._json?.campus?.[0]?.language?.identifier || 'ca';
    const campusCountry = profile._json?.campus?.[0]?.country || null;
    const countryCode = await this.authService.getCountryCode(campusCountry);
  
    //console.warn('[42Strategy] 🔍 Full profile._json dump:');
    //console.warn(JSON.stringify(profile._json, null, 2));
    const user = {
      oauthId: id,
      oauthProvider: '42',
      email: emails?.[0]?.value || `${username}@student.42.fr`,
      nick: username,
      avatarUrl: avatarUrl,
      lang: languageIdentifier,
      country: countryCode,
    };


    return user;
  }
}