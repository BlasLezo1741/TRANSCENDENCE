import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta tu ruta al Guard

@Controller('auth/stats')
@UseGuards(JwtAuthGuard)

export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.statsService.getLeaderboard();
  }

  @UseGuards(JwtAuthGuard)
    @Get('history')
    async getHistory(@Req() req: any) {
        // req.user.id o req.user.sub, dependiendo de cómo guardéis el ID en el JWT
        const userId = req.user.id || req.user.sub;; 
        return this.statsService.getMatchHistory(userId);
    }
}