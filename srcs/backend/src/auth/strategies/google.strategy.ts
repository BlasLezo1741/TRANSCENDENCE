import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
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

    // Extract language from Google locale (if available)
    let lang: string | null = null;
    let country: string | null = null;

    if (_json.locale) {
      const normalizedLocale = _json.locale.replace('_', '-');
      const parts = normalizedLocale.split('-');
      
      if (parts.length > 0) {
        lang = parts[0].toLowerCase();
        console.log(`[GoogleStrategy] Google locale language for ${displayName}: ${lang}`);
      }
      
      if (parts.length > 1) {
        country = parts[1].toUpperCase();
        console.log(`[GoogleStrategy] Google locale country for ${displayName}: ${country}`);
      }
    } else {
      console.log(`[GoogleStrategy] No Google locale for ${displayName} (ID: ${id})`);
    }

    // Get avatar URL
    let avatarUrl = photos?.[0]?.value;
    if (avatarUrl) {
      avatarUrl = avatarUrl.split('=')[0];
      avatarUrl = `${avatarUrl}=s200`;
    }

    const user = {
      oauthId: id,
      oauthProvider: 'google',
      email: emails?.[0]?.value,
      nick: displayName.replace(/\s+/g, '_').substring(0, 20),
      avatarUrl: avatarUrl,
      googleLang: lang,      // Language from Google (may be null)
      googleCountry: country, // Country from Google (may be null)
    };

    done(null, user);
  }
}