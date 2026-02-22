import { Ball } from "./Ball.ts";
import { Player } from "./Player.ts";
import type { GameMode, GameDifficult } from "../types.ts";

export class Pong
{
    private c: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private mode: GameMode;
    private diff: GameDifficult;
    public readonly player1: Player;
    public readonly player2: Player;
    public readonly ball: Ball;

    public readonly keysPressed: { [key: string]: boolean } = {};
    public readonly playerNumber: number; // 1 (Left) o 2 (Right)
    public score: number[] = [0, 0];
    private winner: string = "none";

    // Solo para local/IA
    private maxScore: number = 5;
    private end: boolean = false;
    private pause: boolean = false;

    constructor(
        c: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        mode: GameMode,
        diff: GameDifficult,
        n: number,
        leftPlayerName: string,
        rightPlayerName: string,
        ballInit: { x: number, y: number } | null = null,
    )
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        if (mode === "ia")
            this.diff = diff;
        else
            this.diff = "";
        this.playerNumber = n; 
        this.player1 = new Player(leftPlayerName, 20, c.height, this.diff);
        this.player2 = new Player(rightPlayerName, c.width - 30, c.height, "");
        this.ball = new Ball(c);
        // LÓGICA DE SINCRONIZACIÓN
        if (ballInit) {
            this.ball.sync(ballInit.x, ballInit.y);
        }
    }

    // --- INPUT REMOTO (Socket) ---
    // Mueve la pala del rival visualmente en remoto
    moveOpponent(dir: 'up' | 'down' | 'stop')
    {
        const opponent = this.playerNumber === 1 ? this.player2 : this.player1;

        if (dir === 'up') opponent.moveUp(); // Asume que Player tiene moveUp()
        else if (dir === 'down') opponent.moveDown();
    }

    // --- UPDATE (Bucle Visual) ---
    update()
    {
        if (this.pause) return;

        // 1. AI MODE (Play against Bot)
        if (this.mode === 'ia') {
            this.handleLocalInput(this.player1, 'w', 's'); // Human (Left)
            this.handleLocalInput(this.player1, 'ArrowUp', 'ArrowDown'); // Alternative
            
            // Bot AI (Right) - Assuming Player has moveIA method
            // Si no lo tiene, avísame para dártelo.
            this.player2.moveIA(this.ball.y); 

            // Local Physics
            this.ball.update([this.player1, this.player2]); 
            this.checkLocalWin();
        }
        
        // 2. LOCAL MODE (1 PC, 2 Humans) 
        else if (this.mode === 'local') {
            this.handleLocalInput(this.player1, 'w', 's'); // P1: WASD
            this.handleLocalInput(this.player2, 'ArrowUp', 'ArrowDown'); // P2: Arrows
            
            // Local Physics
            this.ball.update([this.player1, this.player2]);
            this.checkLocalWin();
        }

        // 3. REMOTE MODE / TOURNAMENT (Online
        else {
            // We only manage OUR input for client prediction.
            // The ball physics and rival come from the server (Canvas.tsx).
            const myPlayer = this.playerNumber === 1 ? this.player1 : this.player2;
            this.handleLocalInput(myPlayer); 
        }
    }

    // --- UTILS ---

    private handleLocalInput(p: Player, upKey: string = 'ArrowUp', downKey: string = 'ArrowDown')
    {
        // In online mode (without args), we accept both keys for the active player
        const wKey = 'w';
        const sKey = 's';
        const uKey = 'ArrowUp';
        const dKey = 'ArrowDown';

        // If keys are specified (local 1v1 mode), we are strict
        if (arguments.length > 1) {
             if (this.keysPressed[upKey]) p.moveUp();
             if (this.keysPressed[downKey]) p.moveDown();
        } 
        // If not (online mode or IA P1), we accept everything
        else {
             if (this.keysPressed[uKey] || this.keysPressed[wKey]) p.moveUp();
             if (this.keysPressed[dKey] || this.keysPressed[sKey]) p.moveDown();
        }
    }

    private checkLocalWin()
    {
        // Actualizamos score local desde la bola
        this.score = this.ball.getScore();

        if (this.score[0] >= this.maxScore) {
            this.winner = this.player1.getName();
            this.end = true;
        } else if (this.score[1] >= this.maxScore) {
            this.winner = this.player2.getName();
            this.end = true;
        }
    }

    // --- DRAW (Renderizado) ---
    draw()
    {
        if (this.pause)
            return ;

        // 1. Limpiar
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        // 2. Dibujar Red (Decoración)
        this.drawNet();

        // 3. Dibujar Elementos
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);
        this.ball.draw(this.ctx);

        // 4. Dibujar UI
        // if (this.pause)
        //     this.drawPause();
        //else
            this.drawScore();
    }

    private drawScore()
    {
        this.ctx.font = "48px Arial";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";
        
        // P1 Score
        this.ctx.fillText(this.score[0].toString(), this.c.width * 0.25, 20);
        // P2 Score
        this.ctx.fillText(this.score[1].toString(), this.c.width * 0.75, 20);
        
        // Names (Optional) 
        // this.ctx.font = "20px Arial";
        // this.ctx.fillText(this.player1.getName(), this.c.width * 0.25, 70);
        // this.ctx.fillText(this.player2.getName(), this.c.width * 0.75, 70);
    }

    private drawPause()
    {
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("| |", this.c.width / 2, this.c.height / 2);
    }

    private drawNet()
    {
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(this.c.width / 2, 0);
        this.ctx.lineTo(this.c.width / 2, this.c.height);
        this.ctx.strokeStyle = "white";
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.closePath();
    }

    setPause()
    {
        this.pause = !this.pause;
        if (this.pause)
            this.drawPause();
    }
    hasWinner(): boolean { return this.end; }
    getWinner() { return this.winner; }
}