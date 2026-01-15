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
    playerNumber: number; // 1 (Left) o 2 (Right)
    score: number[] = [0, 0];
    winner: string = "none";

    constructor(
        c: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        mode: GameMode,
        n: number,
        leftPlayerName: string,
        rightPlayerName: string,
        ballInit: { x: number, y: number } | null = null,
    )
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        this.playerNumber = n; 
        this.player1 = new Player(leftPlayerName, 20, c.height);
        this.player2 = new Player(rightPlayerName, c.width - 30, c.height);
        this.ball = new Ball(c);
        // LÓGICA DE SINCRONIZACIÓN
        if (ballInit) {
            this.ball.sync(ballInit.x, ballInit.y);
        }
    }

    // --- INPUT REMOTO (Socket) ---
    // Mueve la pala del rival visualmente en remoto
    moveOpponent(dir: 'up' | 'down' | 'stop') {
        const opponent = this.playerNumber === 1 ? this.player2 : this.player1;

        if (dir === 'up') opponent.moveUp(); // Asume que Player tiene moveUp()
        else if (dir === 'down') opponent.moveDown();
    }

    // --- UPDATE (Bucle Visual) ---
    // Solo gestiona inputs locales para suavidad. NO FÍSICA.
    update()
    {
        // Mover MI pala (Jugador Local)
        const myPlayer = this.playerNumber === 1 ? this.player1 : this.player2;
        
        // Si es partida IA o Local, movemos diferente, pero para REMOTE:
        if (this.mode.includes('remote') || this.mode.includes('tournament')) {
            this.handleLocalInput(myPlayer);
        }
        else if (this.mode === 'local') {
             // Local: Mueve ambos con teclas distintas
             this.handleLocalInput(this.player1, 'w', 's');
             this.handleLocalInput(this.player2, 'ArrowUp', 'ArrowDown');
            // En local, el frontend calcula la física. En remoto, NO.
             this.ball.update(this.player1, this.player2);
        }

    }

    private handleLocalInput(p: Player, upKey: string = 'ArrowUp', downKey: string = 'ArrowDown') {
        // También aceptamos W/S genérico si es mi jugador
        const wKey = 'w';
        const sKey = 's';

        if (this.keysPressed[upKey] || this.keysPressed[wKey]) {
            p.moveUp();
        }
        if (this.keysPressed[downKey] || this.keysPressed[sKey]) {
            p.moveDown();
        }
    }

    // --- DRAW (Renderizado) ---
    draw()
    {
        // 1. Limpiar
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        // 2. Dibujar Red (Decoración)
        this.drawNet();

        // 3. Dibujar Elementos
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);
        this.ball.draw(this.ctx);

        // 4. Dibujar Marcador (El que viene del server)
        this.drawScore();
    }
 down
    private drawScore() {
        this.ctx.font = "48px Arial";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";
        
        // Puntuación P1
        this.ctx.fillText(this.score[0].toString(), this.c.width * 0.25, 20);
        // Puntuación P2
        this.ctx.fillText(this.score[1].toString(), this.c.width * 0.75, 20);
        
        // Nombres (Opcional)
        this.ctx.font = "20px Arial";
        this.ctx.fillText(this.player1.getName(), this.c.width * 0.25, 70);
        this.ctx.fillText(this.player2.getName(), this.c.width * 0.75, 70);
    }

    private drawNet() {
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(this.c.width / 2, 0);
        this.ctx.lineTo(this.c.width / 2, this.c.height);
        this.ctx.strokeStyle = "white";
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.closePath();
    }

    // Helpers vacíos para compatibilidad
    setPause() {} 
    hasWinner() { return false; } // El socket decide 'game_over', no esta clase local
    getWinner() { return this.winner; }
}