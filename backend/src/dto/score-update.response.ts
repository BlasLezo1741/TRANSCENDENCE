export interface ScoreUpdateResponse {
  score: [number, number]; // [puntos_jugador1, puntos_jugador2]
  scorerId: string;        // ID del que acaba de anotar
}