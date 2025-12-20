import { Player } from "./classes/player.js"
import { Ball } from "./classes/ball.js"

export const canvas = document.getElementById("game") as HTMLCanvasElement
const ctx = canvas.getContext("2d")!;

export function setCanvasState(state: canvasDisplay)
{
	canvas.style.display = state;
}

export function draw(player: Player[], ball: Ball)
{
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "white";

	player.forEach(p => p.draw(ctx));
	ball.draw(ctx);
}

export function drawScore(a: number, b: number)
{
	alert(`¡${a} - ${b}!`);
}
