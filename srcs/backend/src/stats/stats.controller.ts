import { Controller, Get, UseGuards } from '@nestjs/common';
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
}