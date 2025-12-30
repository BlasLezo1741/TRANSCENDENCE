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

    keysPressed: { [key: string]: boolean } = {};
    playerNumber: number;

    score: number[] = [0, 0];
    pause: boolean;

    constructor(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mode: GameMode, n: number)
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        this.player1 = new Player(20, c.height);
        this.player2 = new Player(c.width - 30, c.height);
        this.ball = new Ball(c);
        this.playerNumber = n;
        this.pause = false;
    }

    setPause()
    {
        this.pause = !this.pause;
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
        if (this.pause)
            return ;

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
                this.updatePlayer(this.player2, "ArrowUp", "ArrowDown");
        }
    }

    private drawPause()
    {
        this.ctx.font = "48px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("PAUSE", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
    }

    private drawGame()
    {
        // Paint players
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // Paint ball
        this.ball.draw(this.ctx);

        this.score = this.ball.getScore();
        this.ctx.font = "48px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(this.score[0].toString(), 200, 20);
        this.ctx.fillText(this.score[1].toString(), 600, 20);
    }

    draw()
    {
        // Clean screen
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        this.ctx.fillStyle = "white";
        this.pause ? this.drawPause() : this.drawGame();
    }
}