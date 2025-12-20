import { updatePosition } from "./move.js"
import { draw } from "./draw.js"
import { drawScore } from "./draw.js"
import { canvas } from "./draw.js"
import { Player } from "./classes/player.js"
import { Ball } from "./classes/ball.js"
import { ScoreManager } from "./classes/scoreManager.js"

let players: Player[] = [
	new Player("alpha", 20, 250, "w", "s"),
	new Player("beta", 760, 250, "ArrowUp", "ArrowDown")
];

let ball: Ball = new Ball(400, 300);

let score: ScoreManager = new ScoreManager(players, 9);

export function gameLoop()
{
	updatePosition(players, ball);
	draw(players, ball);
	//drawScore(score.getScore(players[0]), score.getScore(players[1]));
	requestAnimationFrame(gameLoop);
}
