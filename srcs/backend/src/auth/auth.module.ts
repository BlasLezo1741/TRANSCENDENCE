import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { FortyTwoStrategy } from './strategies/fortytwo.strategy';
import { DatabaseModule } from '../database.module'; 

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    DatabaseModule, // Required for injecting DRIZZLE into AuthService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    FortyTwoStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}