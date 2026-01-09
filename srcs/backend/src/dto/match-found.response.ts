export interface MatchFoundResponse {
  roomId: string;
  matchId: number;
  side: 'left' | 'right';
  opponent: {
    name: string;
    avatar: string;
  };
  ballInit?: {
      x: number;
      y: number;
  };
}