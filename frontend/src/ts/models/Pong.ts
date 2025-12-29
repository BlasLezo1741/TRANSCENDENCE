import { Ball } from "./Ball.ts";
import { Player } from "./Player.ts";
import type { GameMode } from "../types.ts";

export class Pong
{
    c: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    mode: GameMode;
    player1: Player;
    player2: Player;
    ball: Ball;

    // control1: boolean;
    // control2: boolean;

    keysPressed: { [key: string]: boolean } = {};
    playerNumber: number;

    constructor(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mode: GameMode, n: number)
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        this.player1 = new Player(20, c.height);
        this.player2 = new Player(760, c.height);
        this.ball = new Ball(c);
        this.playerNumber = n;
        // this.control1 = this.control2 = true;   
    }

    updatePlayer(p: Player, up: string, down: string)
    {
        if (this.keysPressed[up])
            p.moveUp();
        if (this.keysPressed[down])
            p.moveDown();
    }

    update()
    {
        // Update ball

        this.ball.update();

        // Update players

        if (this.mode == "ia")
        {
            this.updatePlayer(this.player1, "w", "s");
            this.player2.moveIA(this.ball.y);
        }
        else if (this.mode == "local")
        {
            this.updatePlayer(this.player1, "w", "s");
            this.updatePlayer(this.player2, "ArrowUp", "ArrowDown");
        }
        else
        {
            if (this.playerNumber == 1)
                this.updatePlayer(this.player1, "w", "s");
            else
                this.updatePlayer(this.player2, "w", "s");
        }
        
    }

    draw()
    {
        // Clean screen
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        // Paint background
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.c.width, this.c.height);

        this.ctx.fillStyle = "white";

        // Paint players
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // Paint ball
        this.ball.draw(this.ctx);
    }
}