import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Fix: Add || '' to prevent 'string | undefined' errors
      clientID: configService.get<string>('OAUTH_GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('OAUTH_GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('OAUTH_GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos, _json } = profile;
    let lang = 'en'; // Default
    let country = 'FR'; // Default for Unkonwn
    let avatarUrl = photos?.[0]?.value;
    if (avatarUrl) {
      avatarUrl = avatarUrl.split('=')[0];
      avatarUrl = `${avatarUrl}=s200`;
    }

    if (_json.locale) {
      const parts = _json.locale.split('-'); // Split "en-US" into ["en", "US"]
      if (parts.length > 0) lang = parts[0];
      if (parts.length > 1) country = parts[1].toUpperCase();
    }

    const user = {
      oauthId: id,
      oauthProvider: 'google',
      email: emails?.[0]?.value,
      nick: displayName.replace(/\s+/g, '_').substring(0, 20),
      avatarUrl: avatarUrl,
      lang,
      country,
    };

    done(null, user);
  }
}