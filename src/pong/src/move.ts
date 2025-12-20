import { Player } from "./classes/player.js"
import { Ball } from "./classes/ball.js"

let	keys: { [key: string]: boolean } = {};

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

export function updatePosition(player: Player[], ball: Ball)
{
	ball.move();
	player.forEach(p =>
	{
		if (keys[p.getUp()])
			p.moveUp();
		if (keys[p.getDown()])
			p.moveDown();
		ball.playerCollision(p);
	});
}
