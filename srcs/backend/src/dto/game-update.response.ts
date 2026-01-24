//codigo para el servidor calcula la fisica
// export interface GameUpdateResponse {
//   ball: { x: number; y: number };
//   p1_y: number;
//   p2_y: number;
// }

export interface GameUpdateResponse {
  playerId: string;             // ID del socket que se movió
  move: 'up' | 'down' | 'stop'; // La acción que realizó
}