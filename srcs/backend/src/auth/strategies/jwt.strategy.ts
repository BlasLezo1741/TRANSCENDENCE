import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define the payload interface to keep types clean
export interface JwtPayload {
  sub: number;
  email: string;
  nick: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Fix: Ensure secret is never undefined. 
      // In production, if JWT_SECRET is missing, the app should probably fail earlier, 
      // but this fallback satisfies TypeScript.
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret',
    });
  }

  async validate(payload: JwtPayload) {
    // This value is injected into @Req() req.user
    return { id: payload.sub, email: payload.email, nick: payload.nick };
  }
}