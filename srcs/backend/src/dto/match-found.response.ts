export interface MatchFoundResponse {
  roomId: string;
  side: 'left' | 'right';
  opponent: {
    name: string;
    avatar: string;
  };
}