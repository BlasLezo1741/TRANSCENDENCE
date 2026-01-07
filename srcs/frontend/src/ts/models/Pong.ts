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

    maxScore: number;
    score: number[] = [0, 0];
    pause: boolean;

    winner: string;
    end: boolean;

    private opponentMove: 'up' | 'down' | 'stop' = 'stop'; // <--- NUEVO: Control remoto

    constructor(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mode: GameMode, n: number, max: number, localPlayerName: string)
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        this.playerNumber = n; // Asignamos esto ANTES de crear los jugadores
        // this.player1 = new Player("user_1", 20, c.height);
        // this.player2 = new Player("user_2", c.width - 30, c.height);
        // LÓGICA DE NOMBRES DINÁMICA
        if (mode.includes('remote') || mode.includes('tournament')) {
            // En remoto, depende de si soy el 1 o el 2
            if (this.playerNumber === 1) {
                // Yo soy el Player 1 (Izquierda)
                this.player1 = new Player(localPlayerName, 20, c.height);
                this.player2 = new Player("Oponente", c.width - 30, c.height);
            } else {
                // Yo soy el Player 2 (Derecha)
                this.player1 = new Player("Oponente", 20, c.height);
                this.player2 = new Player(localPlayerName, c.width - 30, c.height);
            }
        } 
        else if (mode === 'ia') {
            this.player1 = new Player(localPlayerName, 20, c.height);
            this.player2 = new Player("IA-Bot", c.width - 30, c.height);
        } 
        else {
            // Modo Local
            this.player1 = new Player(localPlayerName, 20, c.height);
            this.player2 = new Player("Invitado", c.width - 30, c.height);
        }
        this.ball = new Ball(c);
        this.pause = this.end = false;
        this.winner = "none";
        this.maxScore = max;
    }

    // --- NUEVO MÉTODO PARA EL SOCKET ---
    moveOpponent(dir: 'up' | 'down' | 'stop') {
        this.opponentMove = dir;
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

    private winMatch(p: Player)
    {
        this.winner = p.getName();
        this.end = true;
    }

    update()
    {
        if (this.pause)
            return ;

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
        else { // MODOS REMOTOS (remote / tournament)
            if (this.playerNumber == 1) {
                // Yo soy el 1: Me muevo con mis teclas
                this.updatePlayer(this.player1, "w", "s");
                this.updatePlayer(this.player1, "ArrowUp", "ArrowDown"); // Soporte para ambas
                
                // El oponente es el 2: Se mueve según lo que diga el socket
                if (this.opponentMove === 'up') this.player2.moveUp();
                if (this.opponentMove === 'down') this.player2.moveDown();
            } 
            else {
                // Yo soy el 2: Me muevo con mis teclas
                this.updatePlayer(this.player2, "w", "s");
                this.updatePlayer(this.player2, "ArrowUp", "ArrowDown");
                
                // El oponente es el 1: Se mueve según el socket
                if (this.opponentMove === 'up') this.player1.moveUp();
                if (this.opponentMove === 'down') this.player1.moveDown();
            }
        }

        // Update ball

        this.ball.update([this.player1, this.player2]);

        const score: number[] = this.ball.getScore();

        if (score[0] == this.maxScore)
            this.winMatch(this.player1);
        else if (score[1] == this.maxScore)
            this.winMatch(this.player2);
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

    hasWinner(): boolean
    {
        return this.end;
    }

    getWinner(): string
    {
        return this.winner;
    }
}