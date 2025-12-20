import { canvas } from "../draw.js"
import { Player } from "./player.js"

type impactSide = "lateral" | "front" | "none";

export class Ball
{
	private				x: number;
	private				y: number;
	private				vx: number;
	private				vy: number;
	
	static readonly		radious: number = 5;
	static readonly		initialSpeed: number = 5;
	private static		speed: number = 12;

	private				collided: boolean = false;
	
	constructor(x: number, y: number)
	{
		this.x = x;
		this.y = y;

		const dirX = Math.random() < 0.5 ? -1 : 1;
		const dirY = Math.random() * 2 - 1;
		const leng = Math.sqrt(dirX * dirX + dirY * dirY);
		
		this.vx = (dirX / leng) * Ball.initialSpeed;
		this.vy = (dirY / leng) * Ball.initialSpeed;
	}

	private wallCollision()
	{
		if (this.y <= 0 + Ball.radious || this.y >= canvas.height - Ball.radious)
			this.vy = -this.vy;
	}

	move()
	{
		this.wallCollision();
		this.x += this.vx;
		this.y += this.vy;
	}

	draw(ctx: CanvasRenderingContext2D)
	{
		ctx.beginPath();
		ctx.arc(this.x, this.y, Ball.radious, 0, Math.PI * 2);
		ctx.fill();
	}

	private detectCollision(player: Player)
	{
		const	px = player.getX();
		const	py = player.getY();
		const	pw = player.getWidth();
		const	ph = player.getHeight();

	   	if (this.x + Ball.radious >= px && this.x - Ball.radious <= px + pw)
		{
			if (this.y >= py && this.y <= py + ph)
				return "front";
		}
/*
		if (this.y + Ball.radious >= py && this.y - Ball.radious <= py + ph)
		{
			if (this.x >= px && this.x <= px + pw)
				return "lateral";
		}*/
		return "none";
	}

	playerCollision(player: Player)
	{
		let side: impactSide = this.detectCollision(player);

		if (!this.collided && side != "none")
		{
			const current = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
			const scale = Ball.speed / current;
			this.vx = this.vx * scale;
			this.vy = this.vy * scale;
			this.collided = true;
		}

		switch (side)
		{
			/*case "lateral":
				this.vy = -this.vy;
				break;*/
			case "front":
				this.vx = -this.vx;
				break;
			case "none":
				break;
			default: 
				throw new Error("unexpected error in player collision");
		}
	}
}
