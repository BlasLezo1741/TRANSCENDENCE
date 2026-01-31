import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
const Strategy = require('passport-42').Strategy;
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('OAUTH_42_CLIENT_ID'),
      clientSecret: configService.get<string>('OAUTH_42_CLIENT_SECRET'),
      callbackURL: configService.get<string>('OAUTH_42_CALLBACK_URL'),
      scope: ['public'],
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, emails, photos, _json } = profile;
    
    // Get medium-size avatar
    const avatarUrl = 
      _json?.image?.versions?.medium || 
      photos?.[0]?.value || 
      null;

    // Extract campus information
    const campusData = _json?.campus?.[0];
    let campusName: string | null = null;
    let campusCountry: string | null = null;
    let suggestedCountry: string | null = null;

    if (campusData) {
      campusName = campusData.name || null;
      campusCountry = campusData.country || null;
      
      // Map campus to 2-letter country code
      const campusCountryMap: Record<string, string> = {
        // Spain
        'Paris': 'FR',
        'Madrid': 'ES',
        'Barcelona': 'ES',
        'Málaga': 'ES',
        'Urduliz': 'ES',
        // Portugal
        'Lisbon': 'PT',
        // Germany
        'Berlin': 'DE',
        'Heilbronn': 'DE',
        'Wolfsburg': 'DE',
        // Austria
        'Vienna': 'AT',
        // Netherlands
        'Amsterdam': 'NL',
        // Belgium
        'Brussels': 'BE',
        // UK
        'London': 'GB',
        // Turkey
        'Istanbul': 'TR',
        // Asia
        'Tokyo': 'JP',
        'Seoul': 'KR',
        'Bangkok': 'TH',
        'Singapore': 'SG',
        // Americas
        'São Paulo': 'BR',
        'Quebec': 'CA',
        'Fremont': 'US',
        // Middle East
        'Beirut': 'LB',
        'Abu Dhabi': 'AE',
        // Africa
        'Khouribga': 'MA',
        // Others
        'Yerevan': 'AM',
        'Moscow': 'RU',
      };

      suggestedCountry = campusName ? campusCountryMap[campusName] || null : null;

      console.log(`[42Strategy] User ${username} campus:`, {
        campusName,
        campusCountry,
        suggestedCountryCode: suggestedCountry,
      });
    } else {
      console.log(`[42Strategy] No campus data for user ${username} (ID: ${id})`);
    }

    const user = {
      oauthId: id,
      oauthProvider: '42',
      email: emails?.[0]?.value || `${username}@student.42.fr`,
      nick: username,
      avatarUrl: avatarUrl,
      campusName: campusName,           // For logging/debugging
      campusCountry: campusCountry,     // For logging/debugging
      campus42Country: suggestedCountry, // Suggested 2-letter country code
    };

    return user;
  }
}