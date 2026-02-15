export interface MatchFoundResponse {
  roomId: string;
  matchId: number;
  side: 'left' | 'right';
  opponent: {
    id: number;
    name: string;
    avatar: string | null;
  };
  ballInit?: {
      x: number;
      y: number;
  };
}