import { Module, Global } from '@nestjs/common';
import { GameGateway } from './game.gateway';

@Global()
@Module({
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}