// srcs/auth-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [DatabaseModule, AuthModule],
})
export class AppModule {}


